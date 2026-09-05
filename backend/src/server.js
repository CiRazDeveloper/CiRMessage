import cookieParser from "cookie-parser"
import dotenv from "dotenv";
import express from "express";
import path from "path";

import { connectDB } from "./lib/db.js"
import routesAuth from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import mediaRoutes from "./routes/media.js";
import routesMessages from "./routes/messages.js";



// --- CONFIGURATIONS ---
dotenv.config();
const app = express();
const __dirname = path.resolve();
app.use(express.json()); // req.body
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));


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
                app.listen(PORT, () => {
                    console.log(`Server listening on port ${PORT}`);
                });
            });