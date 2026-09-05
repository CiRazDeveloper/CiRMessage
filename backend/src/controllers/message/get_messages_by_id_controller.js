import mod_message from "../../models/mod_message.js";
import { STATUS_CODES } from "../../status_codes.js";

export const getMessagesByUserId = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: userToChatId } = req.params;

        const messages = await mod_message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId },
            ],
        })

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json(messages);
    } catch (error) {
        console.error("Error in getMessagesByUserId:", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};