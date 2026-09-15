import { Server } from "socket.io";
import { parse } from "cookie";
import jwt from "jsonwebtoken";

import { getAllowedOrigins } from "./cors.js";

import mod_message from "../models/mod_message.js";
import mod_user from "../models/mod_user.js";

let io;

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
                                new: true,
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