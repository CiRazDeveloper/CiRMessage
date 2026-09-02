import express from "express";
import { signup } from "../controllers/signup_controller.js";

// --- CONFIGURATIONS ---
const router = express.Router();

// --- GET METHODS ---
router.post("/signup", signup);

router.get("/login", (req, res) => {
    res.send("Login endpoint");
});

router.get("/logout", (req, res) => {
    res.send("Logout endpoint");
});

export default router;