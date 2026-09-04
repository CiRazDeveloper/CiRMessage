import "dotenv/config";
import mod_user from "../models/mod_user.js";

import { generateToken } from "../ultilities/utils.js";
import { hashPassword } from "../ultilities/pass_hash.js";
import { STATUS_CODES } from "../status_codes.js";

export const signup = async (req, res) => {
    let { displayName, username, email, password } = req.body;

    try {
        // Check required fields
        if (!displayName || !username || !email || !password) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "All fields must be filled out" });
        }

        // Clean input
        displayName = displayName.trim();
        username = username.trim().toLowerCase();
        email = email.trim().toLowerCase();
        password = password.trim();

        // Validate displayName
        const displayNameError = checkDisplayName(displayName);
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
        const emailError = await checkEmail(email);
        if (emailError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: emailError });
        }

        // Validate password
        const passwordError = checkPassword(password);
        if (passwordError) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: passwordError });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const newUser = new mod_user({
            displayName,
            username,
            email,
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
                email: newUser.email,
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


function checkDisplayName(displayName) {
    if (displayName.length < 3) {
        return "Display name length must be three (3) or more";
    }

    return null;
}


async function checkUsername(username) {
    if (username.length < 3) {
        return "Username length must be three (3) or more";
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
    const emailRegex = new RegExp(process.env.EMAIL_REGEX);

    if (!emailRegex.test(email)) {
        return "Invalid email format";
    }

    const userEmail = await mod_user.findOne({
        email: email.toLowerCase()
    });

    if (userEmail) {
        return "A user with this email already exists";
    }

    return null;
}


function checkPassword(password) {
    if (password.length < 8) {
        return "Password length must be eight (8) or more";
    }

    // Environment variables are strings, so convert to RegExp
    const passwordRegex = new RegExp(process.env.PASSWORD_REGEX);

    if (!passwordRegex.test(password)) {
        return "The password needs to contain at least one (1) lowercase letter, one (1) uppercase letter, one (1) number and one (1) special character";
    }

    return null;
}