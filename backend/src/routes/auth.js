import express from "express";

import { login } from "../controllers/auth/login_controller.js";
import { logout } from "../controllers/auth/logout_controller.js";
import { resetPassword } from "../controllers/auth/reset_password_controller.js";
import { signup } from "../controllers/auth/signup_controller.js";
import { protectRoute } from "../middlewares/mid_auth.js";
import { STATUS_CODES } from "../status_codes.js";


// --- CONFIGURATIONS ---
const router = express.Router();

// --- API METHODS ---
router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.post("/resetPassword", resetPassword);

router.get("/check", protectRoute, (req, res) => res.status(STATUS_CODES.INFO.WEB_OK).json(req.user));

export default router;