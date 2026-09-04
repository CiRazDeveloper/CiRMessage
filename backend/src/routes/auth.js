import express from "express";

import { signup } from "../controllers/auth/signup_controller.js";
import { login } from "../controllers/auth/login_controller.js";
import { logout } from "../controllers/auth/logout_controller.js";

// --- CONFIGURATIONS ---
const router = express.Router();

// --- API METHODS ---
router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

export default router;