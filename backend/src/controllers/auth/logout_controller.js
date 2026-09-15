import "dotenv/config";

import { STATUS_CODES } from "../../status_codes.js";

const isProduction = process.env.NODE_ENV !== "development";

export const logout = (req, res) => {
    res.cookie("jwt", "", {
        maxAge: 0,
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction
    });

    return res
        .status(STATUS_CODES.INFO.WEB_OK)
        .json({ message: "Logged out successfully" });
}