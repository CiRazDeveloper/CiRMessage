import { Server } from "socket.io";
import { getAllowedOrigins } from "./cors.js";

let io;

export function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: getAllowedOrigins(),
            credentials: true,
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error("Socket.IO has not been initialized");
    }

    return io;
}