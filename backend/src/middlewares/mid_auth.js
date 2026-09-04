import "dotenv/config";
import jwt from "jsonwebtoken"
import mod_user from "../models/mod_user.js";

import { generateToken } from "../ultilities/utils.js";
import { verifyPassword } from "../ultilities/pass_hash.js";
import { STATUS_CODES } from "../status_codes.js";

export const protectRoute = async (req, res, nextFunc) => {
    try {
        const token = checkToken(req, res);
        if (!token) return;

        const decoded = verifyToken(token);

        const user = await findUser(decoded.userId, res);
        if (!user) return;

        req.user = user;
        nextFunc();
    } catch (error) {
        console.log("Error in auth middleware: ", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal server error" });
    }
};

const checkToken = (req, res) => {
    const token = req.cookies?.jwt;

    if (!token) {
        res
            .status(STATUS_CODES.ERROR.WEB_UNAUTHORIZED)
            .json({ message: "Unauthorized access - No token provided" });

        return null;
    }

    return token;
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

const findUser = async (userId, res) => {
    const user = await mod_user
        .findById(userId)
        .select("-password");

    if (!user) {
        res
            .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
            .json({ message: "User not found" });

        return null;
    }

    return user;
};