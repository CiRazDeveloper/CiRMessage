import express from "express";

import { login } from "../controller/auth/login_controller.js";
import { logout } from "../controller/auth/logout_controller.js";
import { resetPassword } from "../controller/auth/reset_password_controller.js";
import { register } from "../controller/auth/register_controller.js";
import { protectRoute } from "../middleware/mid_auth.js";
import { STATUS_CODES } from "../utility/status_codes.js";


// --- CONFIGURATIONS ---
const router = express.Router();

// --- API METHODS ---

router.post("/login", login);

router.post("/logout", logout);

router.post("/register", register);

router.post("/resetPassword", resetPassword);

router.get("/check", protectRoute, (req, res) => res.status(STATUS_CODES.INFO.WEB_OK).json(req.user));

export default router;