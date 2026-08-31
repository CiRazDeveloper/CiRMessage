import express from "express";
import dotenv from "dotenv";

import routesAuth from "./routes/auth.js";
import routesMessages from "./routes/messages.js";


// --- CONFIGURATIONS ---
dotenv.config();
const app = express();


// --- VARIABLES ---
const PORT = process.env.PORT || 1001;


// --- GET METHODS ---
app.use("/api/auth", routesAuth);
app.use("/api/messages", routesMessages);


app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));