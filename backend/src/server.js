import cookieParser from "cookie-parser"
import dotenv from "dotenv";
import express from "express";
import path from "path";
import cors from "cors";

import { createServer } from "http";
import { connectDB } from "./lib/db.js"
import { initializeSocket } from "./lib/socket.js";

import routesAuth from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import mediaRoutes from "./routes/media.js";
import routesMessages from "./routes/messages.js";


// --- CONFIGURATIONS ---
dotenv.config();
const app = express();
const server = createServer(app);
const __dirname = path.resolve();

app.use(express.json()); // req.body
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin:process.env.CLIENT_URL, credentials: true }));


// --- SOCKET.IO ---
initializeSocket(server);


// --- VARIABLES ---
const PORT = Number(process.env.PORT);


// --- GET METHODS ---
app.use("/api/auth", routesAuth);
app.use("/api/profile", profileRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/messages", routesMessages);

// --- MAKE READY FOR DEPLOYMENT ---
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
    });
}

connectDB().then(() => {
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Server listening on port ${PORT}`);
    });
});