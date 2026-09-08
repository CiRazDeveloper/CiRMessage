import "dotenv/config";
import mod_user from "../../models/mod_user.js";

import { generateToken } from "../../ultilities/utils.js";
import { hashPassword } from "../../ultilities/hash.js";
import { STATUS_CODES } from "../../status_codes.js";
import { encrypt } from "../../ultilities/crypt.js";

export const signup = async (req, res) => {
    let { displayName, username, email, secret, password } = req.body;

    try {
        // Check required fields
        if (!displayName || !username || !email || !secret || !password) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "All fields must be filled out" });
        }

        // Clean input
        displayName = displayName.trim();
        username = username.trim().toLowerCase();
        email = email.trim().toLowerCase();
        secret = secret.trim();
        password = password.trim();

        // Validate displayName
        const displayNameError = await checkDisplayName(displayName);
        if (displayNameError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: displayNameError });
        }

        // Validate username
        const usernameError = await checkUsername(username);
        if (usernameError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: usernameError });
        }

        // Validate email
        const findEmailError = await checkEmail(email);
        if (findEmailError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: findEmailError });
        }

        // Validate secret
        const secretError = await checkSecret(secret);
        if (secretError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: secretError });
        }
 
        // Validate password
        const passwordError = await checkPassword(password);
        if (passwordError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: passwordError });
        }

        // Hashes
        const hashedSecret = await encrypt(secret);
        const hashedPassword = await hashPassword(password);

        // Create user
        const newUser = new mod_user({
            displayName: displayName,
            username: username,
            email: email,
            secret: hashedSecret,
            password: hashedPassword,
            profilePicture: ""
        });

        await newUser.save();

        // Generate authentication token
        generateToken(newUser._id, res);

        return res
            .status(STATUS_CODES.INFO.WEB_CREATED)
            .json({
                _id: newUser._id,
                displayName: newUser.displayName,
                username: newUser.username,
                profilePicture: newUser.profilePicture
            });

        // TODO: send a welcome email to the user
    } catch (error) {
        console.error("Error in signup controller:", error);
        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal server error" });
    }
};


async function checkDisplayName(displayName) {
    if (displayName.length < 3) {
        return "Display name length must be three (3) or more";
    }

    return null;
}

async function checkUsername(username) {
    if (username.length < 3) {
        return "Username length must be three (3) or more";
    }

    // Environment variables are strings, so convert to RegExp
    const usernameRegex = new RegExp(process.env.USERNAME_REGEX);
    if (!usernameRegex.test(username)) {
        return "The username can only contain lower case letters, numbers, underscores and minus characters";
    }

    const userName = await mod_user.findOne({
        username: username.toLowerCase()
    });

    if (userName) {
        return "The username is already taken";
    }

    return null;
}

async function checkEmail(email) {
    // Environment variables are strings, so convert to RegExp
    const emailRegex = new RegExp(process.env.MAIL_REGEX);
    if (!emailRegex.test(email)) {
        return "Invalid email format";
    }

    const userEmail = await mod_user.findOne({ email: email });
    if (userEmail) {
        return "A user with this email already exists";
    }

    return null;
}

async function checkSecret(secret) {
    if (secret.length < 12) {
        return "Secret length must be eight (12) or more";
    }

    // Environment variables are strings, so convert to RegExp
    const secretRegex = new RegExp(process.env.SEC_REGEX);

    if (!secretRegex.test(secret)) {
        return "The secret needs to contain at least one (1) lowercase letter, one (1) uppercase letter, one (1) number";
    }

    return null;
}

async function checkPassword(password) {
    if (password.length < 8) {
        return "Password length must be eight (8) or more";
    }

    // Environment variables are strings, so convert to RegExp
    const passwordRegex = new RegExp(process.env.PASS_REGEX);

    if (!passwordRegex.test(password)) {
        return "The password needs to contain at least one (1) lowercase letter, one (1) uppercase letter, one (1) number and one (1) special character";
    }

    return null;
}
