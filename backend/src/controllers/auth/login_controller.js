import "dotenv/config";
import mod_user from "../../models/mod_user.js";

import { generateToken } from "../../ultilities/utils.js";
import { verifyPassword } from "../../ultilities/pass_hash.js";
import { STATUS_CODES } from "../../status_codes.js";


export const login = async (req, res) => {
    let { username, email, password } = req.body;

    try {
        const user = await mod_user.findOne({
            $or: [
                { email },
                { username }
            ]
        });

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

        res.status(STATUS_CODES.INFO.WEB_OK).json({
            _id: user._id,
            displayName: user.displayName,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
        });

    } catch (error) {
        console.error("Error in login controller: ", error);
        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal server error" });
    }
}

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