import { Server } from "socket.io";
import { parse } from "cookie";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import { getAllowedOrigins } from "./cors.js";

import mod_message from "../models/mod_message.js";
import mod_user from "../models/mod_user.js";
import mod_group from "../models/mod_group.js";

let io;

const getCallTarget = (payload = {}) => ({
    targetUserId:
        payload.targetUserId ||
        payload.targetId ||
        payload.userId ||
        payload.peerUserId ||
        payload.calleeId,
    targetPeerId: payload.targetPeerId,
    groupId: payload.groupId,
});

const isValidId = (id) =>
    typeof id === "string" &&
    mongoose.Types.ObjectId.isValid(id);

const findCallContext = async (userId, payload) => {
    const { targetUserId, targetPeerId, groupId } =
        getCallTarget(payload);

    if (targetUserId && groupId) {
        return {
            error: "Choose a direct user or a group, not both",
        };
    }

    if (targetUserId) {
        if (
            !isValidId(targetUserId) ||
            targetUserId === userId
        ) {
            return {
                error: "Invalid call recipient",
            };
        }

        const relationship =
            await mod_message.exists({
                $or: [
                    {
                        senderId: userId,
                        receiverId: targetUserId,
                    },
                    {
                        senderId: targetUserId,
                        receiverId: userId,
                    },
                ],
            });

        if (!relationship) {
            return {
                error:
                    "Direct calls require an existing direct message relationship",
            };
        }

        return {
            targetUserIds: [targetUserId],
            callScope: {
                type: "direct",
                targetUserId,
                targetId: targetUserId,
            },
        };
    }

    if (groupId) {
        if (!isValidId(groupId)) {
            return {
                error: "Invalid call group",
            };
        }

        const group = await mod_group
            .findOne({
                _id: groupId,
                members: userId,
            })
            .select("members");

        if (!group) {
            return {
                error:
                    "Group calls require membership in an existing group",
            };
        }

        const memberIds = group.members
                .map((memberId) => memberId.toString())
                .filter((memberId) => memberId !== userId),
            targetUserIds = targetPeerId
                ? memberIds.filter((memberId) => memberId === targetPeerId)
                : memberIds;

        if (targetPeerId && targetUserIds.length === 0) {
            return {
                error: "Call peer is not a member of this group",
            };
        }

        return {
            targetUserIds,
            callScope: {
                type: "group",
                groupId,
            },
        };
    }

    return {
        error: "A call recipient or group is required",
    };
};

const createCallPayload = (
    socket,
    payload,
    callScope
) => {
    const allowedFields = [
        "callId",
        "callType",
        "caller",
        "offer",
        "answer",
        "sdp",
        "candidate",
        "sdpMid",
        "sdpMLineIndex",
        "usernameFragment",
        "peerId",
        "participantId",
        "targetPeerId",
        "screenSharing",
        "enabled",
    ];

    const signalingPayload = {
        ...callScope,
        callerId: socket.user._id.toString(),
    };

    allowedFields.forEach((field) => {
        if (payload[field] !== undefined) {
            signalingPayload[field] = payload[field];
        }
    });

    return signalingPayload;
};

const registerCallSignaling = (socket, eventNames, handler) => {
    eventNames.forEach((eventName) => {
        socket.on(eventName, handler);
    });
};

export const getIO = () => {
    if (!io) {
        throw new Error(
            "Socket.IO has not been initialized"
        );
    }

    return io;
};

export const initializeSocket = (server) => {
    const userPresence = new Map();

    io = new Server(server, {
        cors: {
            origin: getAllowedOrigins(),
            credentials: true,
        },
    });

    // --- SOCKET AUTHENTICATION ---
    io.use(async (socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;

            if (!cookieHeader) {
                return next(
                    new Error("Unauthorized - No cookies provided")
                );
            }

            const cookies = parse(cookieHeader);
            const token = cookies.jwt;

            if (!token) {
                return next(
                    new Error("Unauthorized - No token provided")
                );
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            const user = await mod_user
                .findById(decoded.userId)
                .select("-password");

            if (!user) {
                return next(
                    new Error("Unauthorized - User not found")
                );
            }

            socket.user = user;

            next();
        } catch (error) {
            console.error(
                "Socket authentication error:",
                error.message
            );

            next(
                new Error("Unauthorized - Invalid token")
            );
        }
    });

    // --- SOCKET CONNECTION ---
    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();

        socket.join(`user:${userId}`);

        let presence = userPresence.get(userId);

        if (!presence) {
            presence = {
                sockets: new Set(),
                status: "Online",
            };

            userPresence.set(userId, presence);
        }

        presence.sockets.add(socket.id);

        console.log(
            `User connected: ${socket.user.username} (${userId})`
        );

        console.log(
            `Status: ${presence.status}`
        );

        socket.on("set-status", (status, callback) => {
            console.log(
                `Received set-status from ${socket.user.username}:`,
                status
            );

            const allowedStatuses = [
                "Online",
                "Away",
                "Offline"
            ];

            if (!allowedStatuses.includes(status)) {
                callback?.({
                    success: false,
                    message: "Invalid status",
                });

                return;
            }

            const currentPresence = userPresence.get(userId);

            if (!currentPresence) {
                callback?.({
                    success: false,
                    message: "Presence not found",
                });

                return;
            }

            currentPresence.status = status;

            console.log(
                `User ${socket.user.username} changed status to ${status}`
            );

            io.emit("user-status-changed", {
                userId,
                status,
            });

            callback?.({
                success: true,
                status,
            });
        });

        socket.on("get-my-status", (callback) => {
            const currentPresence = userPresence.get(userId);

            callback?.({
                status: currentPresence?.status || "Online",
            });
        });

        const startCall = async (payload = {}, callback) => {
            try {
                const context = await findCallContext(
                    userId,
                    payload
                );

                if (context.error) {
                    callback?.({
                        success: false,
                        message: context.error,
                    });
                    return;
                }

                const signalingPayload =
                    createCallPayload(
                        socket,
                        payload,
                        context.callScope
                    );

                context.targetUserIds.forEach((targetUserId) => {
                    io.to(`user:${targetUserId}`).emit(
                        "call-invite",
                        signalingPayload
                    );
                });

                callback?.({
                    success: true,
                    ...context.callScope,
                });
            } catch (error) {
                console.error(
                    "Could not start call:",
                    error
                );
                callback?.({
                    success: false,
                    message: "Could not start call",
                });
            }
        };

        const forwardCallSignal = async (
            eventName,
            payload = {},
            callback
        ) => {
            try {
                const context = await findCallContext(
                    userId,
                    payload
                );

                if (context.error) {
                    callback?.({
                        success: false,
                        message: context.error,
                    });
                    return;
                }

                const signalingPayload =
                    createCallPayload(
                        socket,
                        payload,
                        context.callScope
                    );

                context.targetUserIds.forEach((targetUserId) => {
                    io.to(`user:${targetUserId}`).emit(
                        eventName,
                        signalingPayload
                    );
                });

                callback?.({ success: true });
            } catch (error) {
                console.error(
                    `Could not forward ${eventName}:`,
                    error
                );
                callback?.({
                    success: false,
                    message: "Could not forward call signal",
                });
            }
        };

        registerCallSignaling(socket, ["call-invite"], startCall);
        registerCallSignaling(
            socket,
            ["call-accept"],
            (payload, callback) =>
                forwardCallSignal(
                    "call-accept",
                    payload,
                    callback
                )
        );
        registerCallSignaling(
            socket,
            ["call-reject"],
            (payload, callback) =>
                forwardCallSignal(
                    "call-reject",
                    payload,
                    callback
                )
        );
        registerCallSignaling(
            socket,
            ["call-end"],
            (payload, callback) =>
                forwardCallSignal(
                    "call-end",
                    payload,
                    callback
                )
        );
        [
            "call-offer",
            "call-answer",
            "call-ice-candidate",
            "call-screen-share",
        ].forEach((eventName) => {
            registerCallSignaling(
                socket,
                [eventName],
                (payload, callback) =>
                    forwardCallSignal(
                        eventName,
                        payload,
                        callback
                    )
            );
        });

       socket.on("message-delivered", async (messageId, callback) => {
                try {
                    const receiverId =
                        socket.user._id.toString();

                    const message =
                        await mod_message.findOneAndUpdate(
                            {
                                _id: messageId,
                                receiverId,
                                delivered: false,
                            },
                            {
                                $set: {
                                    delivered: true,
                                },
                            },
                            {
                                returnDocument: "after",
                            }
                        );

                    if (!message) {
                        callback?.({
                            success: false,
                            message:
                                "Message not found or not allowed",
                        });

                        return;
                    }

                    io.to(
                        `user:${message.senderId.toString()}`
                    ).emit(
                        "message-delivered",
                        {
                            messageId:
                                message._id.toString(),
                        }
                    );

                    callback?.({
                        success: true,
                    });
                } catch (error) {
                    console.error(
                        "Could not mark message as delivered:",
                        error
                    );

                    callback?.({
                        success: false,
                    });
                }
            }
        );

        socket.on("message-read", async (senderId, callback) => {
                try {
                    const receiverId =
                        socket.user._id;

                    const seenAt = new Date();

                    const result =
                        await mod_message.updateMany(
                            {
                                senderId,
                                receiverId,
                                read: false,
                            },
                            {
                                $set: {
                                    delivered: true,
                                    read: true,
                                },
                            }
                        );

                    io.to(
                        `user:${senderId}`
                    ).emit(
                        "message-seen",
                        {
                            seenBy:
                                receiverId.toString(),
                            seenAt:
                                seenAt.toISOString(),
                        }
                    );

                    socket.on("group-message-read", async (groupId, callback) => {
                        try {
                            const group = await mod_group.findOne({
                                _id: groupId,
                                members: socket.user._id,
                            }).select("_id");

                            if (!group) {
                                callback?.({
                                    success: false,
                                    message: "Group not found or access denied",
                                });
                                return;
                            }

                            const result = await mod_message.updateMany(
                                {
                                    groupId: group._id,
                                    senderId: { $ne: socket.user._id },
                                    readBy: { $ne: socket.user._id },
                                },
                                {
                                    $addToSet: {
                                        readBy: socket.user._id,
                                    },
                                }
                            );

                            callback?.({
                                success: true,
                                modifiedCount: result.modifiedCount,
                            });
                        } catch (error) {
                            console.error(
                                "Could not mark group messages as read:",
                                error
                            );
                            callback?.({ success: false });
                        }
                    });

                    callback?.({
                        success: true,
                        modifiedCount:
                            result.modifiedCount,
                    });
                } catch (error) {
                    console.error(
                        "Could not mark messages as read:",
                        error
                    );

                    callback?.({
                        success: false,
                    });
                }
            }
        );

        socket.on("get-user-status", (targetUserId, callback) => {
                const targetPresence =
                    userPresence.get(targetUserId);

                if (
                    !targetPresence ||
                    targetPresence.sockets.size === 0
                ) {
                    callback({
                        status: "Offline",
                    });

                    return;
                }

                callback({
                    status: targetPresence.status,
                });
            }
        );

        socket.on("disconnect", () => {
            const currentPresence =
                userPresence.get(userId);

            if (!currentPresence) {
                return;
            }

            currentPresence.sockets.delete(socket.id);

            if (currentPresence.sockets.size === 0) {
                userPresence.delete(userId);

                io.emit("user-status-changed", {
                    userId,
                    status: "Offline",
                });

                console.log(
                    `User offline: ${socket.user.username}`
                );
            }
        });
    });

    return io;
};