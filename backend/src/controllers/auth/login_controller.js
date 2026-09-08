import "dotenv/config";
import mod_user from "../../models/mod_user.js";

import { generateToken } from "../../ultilities/utils.js";
import { verifyPassword } from "../../ultilities/hash.js";
import { STATUS_CODES } from "../../status_codes.js";

export const login = async (req, res) => {
    let { identifier, password } = req.body;

    try {
        if (!identifier || !password) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "All fields must be filled out" });
        }

        identifier = identifier.trim().toLowerCase();

        // Find user by identifier
        const user = await mod_user.findOne({
            $or: [
                { username: identifier },
                { email: identifier}
            ]
        });

        const userError = await checkUser(user);
        if (userError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: userError });
        }

        const passwordError = await checkPassword(password, user.password);
        if (passwordError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: passwordError });
        }

        generateToken(user._id, res);

        return res.status(STATUS_CODES.INFO.WEB_OK).json({
            _id: user._id,
            displayName: user.displayName,
            username: user.username,
            profilePicture: user.profilePicture,
        });

    } catch (error) {
        console.error("Error in login controller:", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal server error" });
    }
};

async function checkUser(user) {
    if (!user) {
        return "Incorrect login data";
    }
}

async function checkPassword(receivedPassword, storedPassword) {
    const isPasswordCorrect = await verifyPassword(receivedPassword, storedPassword);
    if (!isPasswordCorrect) {
        return "Incorrect login data";
    }

    return null;
}