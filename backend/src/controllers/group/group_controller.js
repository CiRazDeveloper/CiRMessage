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

const idOf = (value) =>
    value?._id?.toString() || value?.toString();

const isGroupOwner = (group, userId) =>
    idOf(group.createdBy) === userId.toString();

const isGroupAdmin = (group, userId) => {
    const id = userId.toString();

    return (
        isGroupOwner(group, userId) ||
        (group.admins || []).some(
            (adminId) => idOf(adminId) === id
        )
    );
};

const isAdminId = (group, userId) => {
    const id = userId.toString();

    return (group.admins || []).some(
        (adminId) => idOf(adminId) === id
    );
};

const getVisibleFromForMember = (group, userId) => {
    const entry = (group.messageVisibility || []).find(
        (item) =>
            item.memberId?.toString() === userId.toString()
    );

    return entry?.visibleFrom || null;
};

const populateGroup = (query) =>
    query
        .populate("members", "-password")
        .populate("createdBy", "-password")
        .populate("admins", "-password");

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
            admins: [req.user._id],
            messageVisibility: memberIds.map((memberId) => ({
                memberId,
                visibleFrom: null,
            })),
        });

        return res.status(STATUS_CODES.INFO.WEB_CREATED)
            .json(
                await populateGroup(
                    mod_group.findById(group._id)
                )
            );
    } catch (error) {
        console.error("Error in createGroup:", error);
        return res.status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};

export const listGroups = async (req, res) => {
    try {
        const groups = await populateGroup(
            mod_group.find({
                members: req.user._id,
            })
        ).sort({ updatedAt: -1 });

        return res.status(STATUS_CODES.INFO.WEB_OK).json(groups);
    } catch (error) {
        console.error("Error in listGroups:", error);
        return res.status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};

export const loadGroup = async (req, res) => {
    try {
        const group = await populateGroup(
            mod_group.findOne({
                _id: req.params.id,
                members: req.user._id,
            })
        );

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

export const leaveGroup = async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user._id;

        if (!isValidId(groupId)) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Invalid group id" });
        }

        const group = await mod_group.findOne({
            _id: groupId,
            members: userId,
        });

        if (!group) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({
                    message:
                        "Group not found or you are no longer a member",
                });
        }

        const leavingId = userId.toString();

        group.members = group.members.filter(
            (memberId) =>
                memberId.toString() !== leavingId
        );
        group.admins = (group.admins || []).filter(
            (adminId) =>
                adminId.toString() !== leavingId
        );
        group.messageVisibility = (
            group.messageVisibility || []
        ).filter(
            (item) =>
                item.memberId?.toString() !== leavingId
        );

        if (group.members.length === 0) {
            await mod_group.deleteOne({
                _id: group._id,
            });

            return res
                .status(STATUS_CODES.INFO.WEB_OK)
                .json({
                    message: "You left the group",
                    groupId: group._id,
                });
        }

        if (
            group.createdBy.toString() ===
            leavingId
        ) {
            const remainingAdmin = group.admins.find(
                (adminId) =>
                    group.members.some(
                        (memberId) =>
                            memberId.toString() ===
                            adminId.toString()
                    )
            );

            group.createdBy =
                remainingAdmin || group.members[0];

            if (
                !group.admins.some(
                    (adminId) =>
                        adminId.toString() ===
                        group.createdBy.toString()
                )
            ) {
                group.admins.push(group.createdBy);
            }
        }

        await group.save();

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json({
                message: "You left the group",
                groupId: group._id,
            });
    } catch (error) {
        console.error("Error in leaveGroup:", error);

        return res
            .status(
                STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR
            )
            .json({
                message: "Internal Server Error",
            });
    }
};

export const addGroupMember = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const { memberId, canSeeHistory } = req.body;

        if (
            !isValidId(groupId) ||
            !isValidId(memberId)
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Invalid group or member id" });
        }

        const group = await mod_group.findOne({
            _id: groupId,
            members: req.user._id,
        });

        if (!group) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "Group not found" });
        }

        if (!isGroupAdmin(group, req.user._id)) {
            return res
                .status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "Only group admins can add members",
                });
        }

        if (
            group.members.some(
                (id) => id.toString() === memberId
            )
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_CONFLICT)
                .json({
                    message: "User is already in this group",
                });
        }

        const userExists = await mod_user.exists({
            _id: memberId,
        });

        if (!userExists) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "User not found" });
        }

        const hasDirectChat = await mod_message.exists({
            $or: [
                {
                    senderId: req.user._id,
                    receiverId: memberId,
                },
                {
                    senderId: memberId,
                    receiverId: req.user._id,
                },
            ],
        });

        if (!hasDirectChat) {
            return res
                .status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "You can only add users from your existing chats",
                });
        }

        group.members.push(memberId);

        group.messageVisibility = (
            group.messageVisibility || []
        ).filter(
            (item) =>
                item.memberId?.toString() !==
                memberId.toString()
        );

        group.messageVisibility.push({
            memberId,
            visibleFrom:
                canSeeHistory === true ? null : new Date(),
        });

        await group.save();

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json(
                await populateGroup(
                    mod_group.findById(group._id)
                )
            );
    } catch (error) {
        console.error("Error in addGroupMember:", error);

        return res
            .status(
                STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR
            )
            .json({ message: "Internal Server Error" });
    }
};

export const removeGroupMember = async (req, res) => {
    try {
        const {
            id: groupId,
            memberId,
        } = req.params;

        if (
            !isValidId(groupId) ||
            !isValidId(memberId)
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Invalid group or member id" });
        }

        const group = await mod_group.findOne({
            _id: groupId,
            members: req.user._id,
        });

        if (!group) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "Group not found" });
        }

        if (!isGroupAdmin(group, req.user._id)) {
            return res
                .status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "Only group admins can remove members",
                });
        }

        if (
            group.createdBy.toString() ===
            memberId
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "The group Owner cannot be removed",
                });
        }

        const requesterIsOwner = isGroupOwner(
            group,
            req.user._id
        );
        const targetIsAdmin = isAdminId(
            group,
            memberId
        );

        if (
            !requesterIsOwner &&
            targetIsAdmin
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "Admins can only remove Members. Only the Owner can remove an Admin.",
                });
        }

        if (
            !group.members.some(
                (id) => id.toString() === memberId
            )
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({
                    message: "User is not a group member",
                });
        }

        group.members = group.members.filter(
            (id) => id.toString() !== memberId
        );
        group.admins = (group.admins || []).filter(
            (id) => id.toString() !== memberId
        );
        group.messageVisibility = (
            group.messageVisibility || []
        ).filter(
            (item) =>
                item.memberId?.toString() !== memberId
        );

        await group.save();

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json(
                await populateGroup(
                    mod_group.findById(group._id)
                )
            );
    } catch (error) {
        console.error(
            "Error in removeGroupMember:",
            error
        );

        return res
            .status(
                STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR
            )
            .json({ message: "Internal Server Error" });
    }
};

export const promoteGroupAdmin = async (req, res) => {
    try {
        const {
            id: groupId,
            memberId,
        } = req.params;

        if (
            !isValidId(groupId) ||
            !isValidId(memberId)
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Invalid group or member id" });
        }

        const group = await mod_group.findOne({
            _id: groupId,
            members: req.user._id,
        });

        if (!group) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "Group not found" });
        }

        if (!isGroupAdmin(group, req.user._id)) {
            return res
                .status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "Only group admins can promote members",
                });
        }

        if (
            !group.members.some(
                (id) => id.toString() === memberId
            )
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({
                    message: "User is not a group member",
                });
        }

        if (
            !group.admins.some(
                (id) => id.toString() === memberId
            )
        ) {
            group.admins.push(memberId);
            await group.save();
        }

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json(
                await populateGroup(
                    mod_group.findById(group._id)
                )
            );
    } catch (error) {
        console.error(
            "Error in promoteGroupAdmin:",
            error
        );

        return res
            .status(
                STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR
            )
            .json({ message: "Internal Server Error" });
    }
};

export const demoteGroupAdmin = async (req, res) => {
    try {
        const {
            id: groupId,
            memberId,
        } = req.params;

        if (
            !isValidId(groupId) ||
            !isValidId(memberId)
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Invalid group or member id" });
        }

        const group = await mod_group.findOne({
            _id: groupId,
            members: req.user._id,
        });

        if (!group) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "Group not found" });
        }

        if (!isGroupOwner(group, req.user._id)) {
            return res
                .status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "Only the Owner can demote an Admin",
                });
        }

        if (
            group.createdBy.toString() ===
            memberId
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({
                    message:
                        "The Owner cannot be demoted",
                });
        }

        if (
            !group.members.some(
                (id) => id.toString() === memberId
            )
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({
                    message: "User is not a group member",
                });
        }

        if (!isAdminId(group, memberId)) {
            return res
                .status(STATUS_CODES.ERROR.WEB_CONFLICT)
                .json({
                    message:
                        "This member is not an Admin",
                });
        }

        group.admins = (group.admins || []).filter(
            (id) => id.toString() !== memberId
        );

        await group.save();

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json(
                await populateGroup(
                    mod_group.findById(group._id)
                )
            );
    } catch (error) {
        console.error(
            "Error in demoteGroupAdmin:",
            error
        );

        return res
            .status(
                STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR
            )
            .json({ message: "Internal Server Error" });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const group = await mod_group.findOne({
            _id: req.params.id,
            members: req.user._id,
        }).select("_id messageVisibility");

        if (!group) {
            return res.status(STATUS_CODES.ERROR.WEB_FORBIDDEN)
                .json({ message: "Group not found or access denied" });
        }

        const visibleFrom = getVisibleFromForMember(
            group,
            req.user._id
        );

        const messageFilter = {
            groupId: group._id,
            ...(visibleFrom && {
                createdAt: {
                    $gte: visibleFrom,
                },
            }),
        };

        await mod_message.updateMany(
            {
                ...messageFilter,
                senderId: { $ne: req.user._id },
                readBy: { $ne: req.user._id },
            },
            {
                $addToSet: {
                    readBy: req.user._id,
                },
            }
        );

        const messages = await mod_message.find(
            messageFilter
        )
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
