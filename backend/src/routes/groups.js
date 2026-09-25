import express from "express";

import { protectRoute } from "../middlewares/mid_auth.js";
import {
    createGroup,
    listGroups,
    loadGroup,
    getGroupMessages,
    leaveGroup,
} from "../controllers/group/group_controller.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createGroup);
router.get("/", listGroups);
router.get("/:id", loadGroup);
router.get("/:id/messages", getGroupMessages);
router.post("/:id/leave", leaveGroup);

export default router;
