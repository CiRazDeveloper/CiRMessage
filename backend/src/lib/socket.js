import { Server } from "socket.io";
import { parse } from "cookie";
import jwt from "jsonwebtoken";

import mod_user from "../models/mod_user.js";

export const initializeSocket = (server) => {
    const userPresence = new Map();

    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
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

        let presence = userPresence.get(userId);

        if (!presence) {
            presence = {
                sockets: new Set(),
                status: "online",
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

        socket.on("get-user-status", (targetUserId, callback) => {
                const targetPresence =
                    userPresence.get(targetUserId);

                if (
                    !targetPresence ||
                    targetPresence.sockets.size === 0
                ) {
                    callback({
                        status: "offline",
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