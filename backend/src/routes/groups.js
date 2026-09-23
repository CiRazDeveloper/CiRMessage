import express from "express";

import { protectRoute } from "../middlewares/mid_auth.js";
import {
    createGroup,
    listGroups,
    loadGroup,
    getGroupMessages,
} from "../controllers/group/group_controller.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createGroup);
router.get("/", listGroups);
router.get("/:id", loadGroup);
router.get("/:id/messages", getGroupMessages);

export default router;
