import express from "express";

import { login } from "../controllers/auth/login_controller.js";
import { logout } from "../controllers/auth/logout_controller.js";
import { reset_password } from "../controllers/auth/reset_password_controller.js";
import { signup } from "../controllers/auth/signup_controller.js";
import { protectRoute } from "../middlewares/mid_auth.js";

// --- CONFIGURATIONS ---
const router = express.Router();

// --- API METHODS ---
router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.post("/reset_password", reset_password);

router.get("/check", protectRoute, (req, res) => res.status(200).json(req.user));

export default router;