import express from "express";

import { protectRoute } from "../middlewares/mid_auth.js";
import upload from "../middlewares/mid_upload.js";

import { getProfileMedia } from "../controllers/media/get_media_controller.js";
import { postMedia } from "../controllers/media/post_media_controller.js";
import { deleteProfileMedia } from "../controllers/media/delete_media_controller.js";

const router = express.Router();

router.get("/get", protectRoute, getProfileMedia);
router.get("/get/:userId", protectRoute, getProfileMedia);

router.post(
    "/post",
    protectRoute,
    upload.single("profilePicture"),
    postMedia
);

router.delete(
    "/delete",
    protectRoute,
    deleteProfileMedia
);

export default router;