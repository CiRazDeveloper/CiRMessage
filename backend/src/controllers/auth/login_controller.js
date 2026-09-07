import "dotenv/config";
import mod_user from "../../models/mod_user.js";

import { decryptEmail } from "../../ultilities/crypt.js";
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

        let user;

        // Username
        user = await mod_user.findOne({
            username: identifier
        });

        // Email
        if (!user) {
            const users = await mod_user.find({});

            for (const possibleUser of users) {
                const email = await decryptEmail(possibleUser.email);

                if (email === identifier) {
                    user = possibleUser;
                    break;
                }
            }
        }

        const userError = checkUser(user);
        if (userError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: userError });
        }

        const passwordError = await checkPassword(password, user);
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

function checkUser(user) {
    if (!user) {
        return "Incorrect login data";
    }
}

async function checkPassword(password, user) {
    const isPasswordCorrect = await verifyPassword(password, user.password);
    if (!isPasswordCorrect) {
        return "Incorrect login data";
    }

    return null;
}