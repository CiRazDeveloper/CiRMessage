import express from "express";

import { protectRoute } from "../middlewares/mid_auth.js";
import upload, {
    handleUploadError,
} from "../middlewares/mid_upload.js";
import { getAllContacts } from "../controllers/message/get_contacts_controller.js";
import { getActiveChats } from "../controllers/message/get_active_chats_controller.js";
import { getMessagesByUserId } from "../controllers/message/get_messages_by_id_controller.js";
import { sendMessage } from "../controllers/message/post_message_controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getActiveChats);
router.get("/:id", getMessagesByUserId);

router.post(
    "/send/:id",
    upload.single("media"),
    handleUploadError,
    sendMessage
);

export default router;