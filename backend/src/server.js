import express from "express";
import dotenv from "dotenv";
import path from "path";

import routesAuth from "./routes/auth.js";
import routesMessages from "./routes/messages.js";


// --- CONFIGURATIONS ---
dotenv.config();
const app = express();
const __dirname = path.resolve();


// --- VARIABLES ---
const PORT = process.env.PORT || 1001;


// --- GET METHODS ---
app.use("/api/auth", routesAuth);
app.use("/api/messages", routesMessages);

// --- MAKE READY FOR DEPLOYMENT ---
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
    });
}

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));