import express from "express";

import { protectRoute } from "../middlewares/mid_auth.js";

import { getMessageMedia } from "../controllers/media/get_media_controller.js";
import { deleteMessageMedia } from "../controllers/media/delete_media_controller.js";

const router = express.Router();

router.get(
    "/message/:messageId",
    protectRoute,
    getMessageMedia
);

router.delete(
    "/message/:messageId",
    protectRoute,
    deleteMessageMedia
);

export default router;