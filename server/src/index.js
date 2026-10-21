
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import cors from "cors";
import { fileURLToPath } from "node:url";

import { createServer } from "node:http";
import { connectDB } from "./lib/db.js";
import { initializeSocket } from "./lib/socket.js";
import { getAllowedOrigins } from "./lib/cors.js";

import routesAuth from "./routes/auth.js";
// import profileRoutes from "./routes/profile.js";
// import mediaRoutes from "./routes/media.js";
// import routesMessages from "./routes/messages.js";
// import routesGroups from "./routes/groups.js";

// --- CONFIGURATIONS ---
dotenv.config();

const app = express();
const server = createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = getAllowedOrigins().filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error(`Origin ${origin} not allowed by CORS`)
        );
    },
    credentials: true,
}));

// --- SOCKET.IO ---
initializeSocket(server);

// --- VARIABLES ---
const PORT = Number(process.env.PORT || 2205);
const HOST = process.env.HOST || "0.0.0.0";

// --- ROUTES ---
app.use("/api/auth", routesAuth);
// app.use("/api/profile", profileRoutes);
// app.use("/api/media", mediaRoutes);
// app.use("/api/messages", routesMessages);
// app.use("/api/groups", routesGroups);

// --- HEALTH CHECK ---
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});

// --- PRODUCTION FRONTEND ---
if (process.env.NODE_ENV === "production") {
    const clientDist = path.resolve(__dirname, "../../client/dist");

    app.use(express.static(clientDist));

    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) {
            return next();
        }

        res.sendFile(path.join(clientDist, "index.html"));
    });
}

// --- START SERVER ---
async function startServer() {
    try {
        await connectDB();

        server.listen(PORT, HOST, () => {
            console.log(`Server listening on http://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
}

startServer();
