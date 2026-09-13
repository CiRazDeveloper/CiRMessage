import { io } from "socket.io-client";

export const socket = io(
    "http://192.168.2.166:1001",
    {
        withCredentials: true,
        autoConnect: false,
    }
);