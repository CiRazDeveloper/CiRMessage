import mod_message from "../../models/mod_message.js";
import mod_user from "../../models/mod_user.js";
import { STATUS_CODES } from "../../status_codes.js";

export const getActiveChats = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const messages = await mod_message.find({
            $or: [
                { senderId: loggedInUserId }, {receiverId: loggedInUserId }
            ],
        })

        const activeChatUsersIds = [
            ...new Set(
                messages.map((msg) =>
                    msg.senderId.toString() === loggedInUserId.toString()
                        ? msg.receiverId.toString()
                        : msg.senderId.toString()
                )
            ),
        ];

        const activeChatUsers = await mod_user.find({ _id: { $in: activeChatUsersIds } }).select("-password");

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json(activeChatUsers);
    } catch (error) {
        console.error("Error in getActiveChats:", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};