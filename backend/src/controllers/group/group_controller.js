import mongoose from "mongoose";

import mod_group from "../../models/mod_group.js";
import mod_message from "../../models/mod_message.js";
import mod_user from "../../models/mod_user.js";
import { STATUS_CODES } from "../../status_codes.js";

const isValidId = (id) =>
    mongoose.Types.ObjectId.isValid(id);

const memberIdsFromRequest = (members, requesterId) => [
    ...new Set([
        requesterId.toString(),
        ...(Array.isArray(members) ? members : []),
    ]),
];

export const createGroup = async (req, res) => {
    try {
        const {
            name,
            members,
            memberIds: requestedMemberIds,
        } = req.body;
        const trimmedName =
            typeof name === "string" ? name.trim() : "";

        if (!trimmedName) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Group name is required" });
        }

        if (trimmedName.length > 100) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Group name is too long" });
        }

        const memberIds = memberIdsFromRequest(
            requestedMemberIds || members,
            req.user._id
        );

        if (memberIds.length < 2) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({
                    message: "A group must have at least two members",
                });
        }

        if (memberIds.some((id) => !isValidId(id))) {
            return res.status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Invalid member id" });
        }

        const memberCount = await mod_user.countDocuments({
            _id: { $in: memberIds },
        });

        if (memberCount !== memberIds.length) {
            return res.status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "One or more users were not found" });
        }

        const requestedOtherMemberIds = memberIds.filter(
            (memberId) =>
                memberId !== req.user._id.toString()
        );

        const directChatMessages = await mod_message.find(
            {
                $or: [
                    {
                        senderId: req.user._id,
                        receiverId: {
                            $in: requestedOtherMemberIds,
                        },
                    },
                    {
                        receiverId: req.user._id,
                        senderId: {
                            $in: requestedOtherMemberIds,
                        },
                    },
                ],
            }
        ).select("senderId receiverId");

        const directChatMemberIds = directChatMessages.flatMap(
            (message) => [
                message.senderId.toString(),
                message.receiverId.toString(),
            ]
        );

        const directChatMemberIdSet = new Set(
            directChatMemberIds
        );

        const hasOnlyExistingChatMembers =
            requestedOtherMemberIds.every((memberId) =>
                directChatMemberIdSet.has(memberId)
            );

        if (!hasOnlyExistingChatMembers) {
            return res.status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "Groups can only include users from your existing chats",
                });
        }

        const group = await mod_group.create({
            name: trimmedName,
            members: memberIds,
            createdBy: req.user._id,
        });

        return res.status(STATUS_CODES.INFO.WEB_CREATED)
            .json(await mod_group.findById(group._id)
                .populate("members", "-password")
                .populate("createdBy", "-password"));
    } catch (error) {
        console.error("Error in createGroup:", error);
        return res.status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};

export const listGroups = async (req, res) => {
    try {
        const groups = await mod_group.find({
            members: req.user._id,
        }).populate("members", "-password").sort({ updatedAt: -1 });

        return res.status(STATUS_CODES.INFO.WEB_OK).json(groups);
    } catch (error) {
        console.error("Error in listGroups:", error);
        return res.status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};

export const loadGroup = async (req, res) => {
    try {
        const group = await mod_group.findOne({
            _id: req.params.id,
            members: req.user._id,
        }).populate("members", "-password").populate("createdBy", "-password");

        if (!group) {
            return res.status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "Group not found" });
        }

        return res.status(STATUS_CODES.INFO.WEB_OK).json(group);
    } catch (error) {
        console.error("Error in loadGroup:", error);
        return res.status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const group = await mod_group.findOne({
            _id: req.params.id,
            members: req.user._id,
        }).select("_id");

        if (!group) {
            return res.status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({ message: "Group not found or access denied" });
        }

        const messages = await mod_message.find({
            groupId: group._id,
        })
            .populate("senderId", "displayName username")
            .sort({ createdAt: 1 })
            .lean();

        return res.status(STATUS_CODES.INFO.WEB_OK).json(
            messages.map((message) => {
                const sender = message.senderId;

                return {
                    ...message,
                    sender,
                    senderId: sender._id,
                    isMine: sender._id.toString() ===
                        req.user._id.toString(),
                };
            })
        );
    } catch (error) {
        console.error("Error in getGroupMessages:", error);
        return res.status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};
