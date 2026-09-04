import express from "express";

import { protectRoute } from "../middlewares/mid_auth.js";
import upload from "../middlewares/mid_upload.js";

import { getMedia } from "../controllers/media/get_media_controller.js";
import { postMedia } from "../controllers/media/post_media_controller.js";
import { deleteMedia } from "../controllers/media/delete_media_controller.js";

// --- CONFIGURATIONS ---
const router = express.Router();

// --- API METHODS ---
// ----------------------------------------
// Current user's profile picture
// ----------------------------------------

router.get(
    "/get",
    protectRoute,
    getMedia
);

// ----------------------------------------
// Any user's profile picture
// ----------------------------------------

router.get(
    "/get/:userId",
    protectRoute,
    getMedia
);

router.post(
    "/post",
    protectRoute,
    upload.single("profilePicture"),
    postMedia
);

router.delete(
    "/delete",
    protectRoute,
    deleteMedia
);

export default router;