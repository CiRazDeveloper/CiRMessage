import { io } from "socket.io-client";
import { defineConfig, loadEnv } from 'vite'

export const socket = io(import.meta.env.VITE_SERVER_URL, {
        withCredentials: true,
        autoConnect: false,
    }
);