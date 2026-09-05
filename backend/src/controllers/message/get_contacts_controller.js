import mod_user from "../../models/mod_user.js";
import { STATUS_CODES } from "../../status_codes.js";

export const getAllContacts = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const filteredUsers = await mod_user.find({ _id: { $ne: loggedInUserId }}).select("-password");

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json(filteredUsers);
    } catch (error) {
        console.log("Error in getAllContacts: ", error);
        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
}