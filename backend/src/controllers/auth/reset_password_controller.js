import "dotenv/config";
import mod_user from "../../models/mod_user.js";

import { decrypt } from "../../ultilities/crypt.js";
import { hashPassword } from "../../ultilities/hash.js";
import { STATUS_CODES } from "../../status_codes.js";

export const resetPassword = async (req, res) => {
    let { identifier, secret, newPassword } = req.body;

    try {
        // Check required fields
        if (!identifier || !secret || !newPassword) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "All fields must be filled out" });
        }

        // Clean input
        identifier = identifier.trim().toLowerCase();

        const user = await mod_user.findOne({
            $or: [
                { username: identifier },
                { email: identifier}
            ]
        });

        // Validate user
        const userError = await checkUser(user, identifier);
        if (userError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: userError });
        }

        // Validate secret
        const secretError = await checkSecret(secret, user.secret);
        if (secretError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: secretError });
        }

        // Validate new password
        const passwordError = await checkPassword(newPassword);
        if (passwordError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: passwordError });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        user.password = hashedPassword;

        await user.save();

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json({
                message: "Password updated successfully!"
            });

    } catch (error) {
        console.error("Error in reset password controller:", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal server error" });
    }
};

async function checkUser(user) {
    if (!user) {
        return "You provided incorrect data!";
    }

    return null;
}

async function checkPassword(password) {
    if (password.length < 8) {
        return "Password length must be eight (8) or more";
    }

    const passwordRegex = new RegExp(process.env.PASSWORD_REGEX);

    if (!passwordRegex.test(password)) {
        return "The password needs to contain at least one (1) lowercase letter, one (1) uppercase letter, one (1) number and one (1) special character";
    }

    return null;
}

async function checkSecret(providedSecret, storedSecret) {
    const decryptedSecret = await decrypt(storedSecret);

    if (providedSecret !== decryptedSecret) {
        return "You provided incorrect data!";
    }

    return null;
}