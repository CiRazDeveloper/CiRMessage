import express from "express";

import { protectRoute } from "../middlewares/mid_auth.js";
import {
    createGroup,
    listGroups,
    loadGroup,
    getGroupMessages,
    leaveGroup,
    addGroupMember,
    removeGroupMember,
    promoteGroupAdmin,
} from "../controllers/group/group_controller.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createGroup);
router.get("/", listGroups);
router.get("/:id", loadGroup);
router.get("/:id/messages", getGroupMessages);
router.post("/:id/leave", leaveGroup);
router.post("/:id/members", addGroupMember);
router.post("/:id/members/:memberId/remove", removeGroupMember);
router.post("/:id/admins/:memberId/promote", promoteGroupAdmin);

export default router;
