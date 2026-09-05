import express from "express";

import { protectRoute } from "../middlewares/mid_auth.js";
import upload from "../middlewares/mid_upload.js";
import { getAllContacts } from "../controllers/message/get_contacts_controller.js";
import { getActiveChats } from "../controllers/message/get_active_chats_controller.js";
import { getMessagesByUserId } from "../controllers/message/get_messages_by_id_controller.js";
import { sendMessage } from "../controllers/message/post_message_controller.js";

const router = express.Router();

router.get("/contacts", protectRoute, getAllContacts);
router.get("/chats", protectRoute, getActiveChats);
router.get("/:id", protectRoute, getMessagesByUserId);

router.post(
    "/send/:id",
    protectRoute,
    upload.single("image"),
    sendMessage
);

export default router;