import "dotenv/config";
import mod_user from "../models/mod_user.js";

import { generateToken } from "../ultilities/utils.js";
import { hashPassword } from "../ultilities/pass_hash.js";
import { STATUS_CODES } from "../status_codes.js";

export const signup = async (req, res) => {
    const { display_name, username, email, password } = req.body;

    try {
        if(!display_name || !username || !email || !password) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json({ message: "All fields must be filled out" });
        }

        if (display_name.length < 3) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json({ message: "Display name length must be three (3) or more" });
        }

        if (username.length < 3) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json({ message: "Username length must be three (3) or more" });
        }

        if (password.length < 8) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json({ message: "Password length must be eight (8) or more" });
        }

        const emailRegex = process.env.EMAIL_REGEX;
        if (!emailRegex.test(email)) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json( {message: "Invalid email format"});
        }

        const passwordRegex = process.env.PASSWORD_REGEX;
        if (!passwordRegex.test(password)) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json({ message: "Password length must be eight (8) or more" });
        }

        const userName = await mod_user.findOne({ username: username.toLowerCase()});
        if (userName) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json({ message: "The username is already taken"});
        }

        const userEmail = await mod_user.findOne({ email: email});
        if (userEmail) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json({ message: "A user with this email already exists"});
        }

        const hashedPassword = await hashPassword(password);

        const newUser = new mod_user({
            display_name: display_name,
            username: username.toLowerCase(),
            email: email,
            password: hashedPassword
        });

        if (newUser) {
            generateToken(newUser._id, res);
            await newUser.save();

            res.status(STATUS_CODES.INFO.WEB_CREATED).json({
                _id: newUser._id,
                display_name: newUser.display_name,
                username: username.toLowerCase(),
                email: newUser.email,
                profilePic: newUser.profile_picture
            })

            // Todo: send a welcome email to the user
        } else {
            res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST).json({ message: "Invalid user data" });
        }

    } catch (error) {
        console.log("Error in signup controller: ", error);
        res.status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR).json({ message: "Internal server error: " + error});
    }
}