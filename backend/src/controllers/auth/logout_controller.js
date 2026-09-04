import "dotenv/config";

import { STATUS_CODES } from "../../status_codes.js";


export const logout = (req, res) => {
    res.cookie("jwt", "", {
        maxAge: 0
    });

    return res
        .status(STATUS_CODES.INFO.WEB_OK)
        .json({ message: "Logged out successfully" });
}