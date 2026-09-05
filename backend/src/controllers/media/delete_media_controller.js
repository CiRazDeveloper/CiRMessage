import "dotenv/config";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";
import mod_message from "../../models/mod_message.js";
import { STATUS_CODES } from "../../status_codes.js";

export const deleteProfileMedia = async (req, res) => {
    try {
        const user = await mod_user
            .findById(req.user._id)
            .select("profilePicture");

        if (!user) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "User not found" });
        }

        if (!user.profilePicture) {
            return res
                .status(STATUS_CODES.INFO.WEB_OK)
                .json({ message: "Profile picture already deleted" });
        }

        const imageKey = user.profilePicture;

        user.profilePicture = "";
        await user.save();

        await minioClient.send(
            new DeleteObjectCommand({
                Bucket: process.env.MINIO_BUCKET,
                Key: imageKey,
            })
        );

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json({ message: "Profile picture deleted successfully" });
    } catch (error) {
        console.error("deleteProfileMedia error:", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Failed to delete profile picture" });
    }
};

export const deleteMessageMedia = async (req, res) => {
    try {
        const message = await mod_message.findById(req.params.messageId);

        if (!message || !message.image) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "Message image not found" });
        }

        if (message.senderId.toString() !== req.user._id.toString()) {
            return res
                .status(STATUS_CODES.ERROR.WEB_UNAUTHORIZED)
                .json({ message: "Only the sender can delete this image" });
        }

        const imageKey = message.image;

        await minioClient.send(
            new DeleteObjectCommand({
                Bucket: process.env.MINIO_BUCKET,
                Key: imageKey,
            })
        );

        message.image = undefined;
        await message.save();

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json({ message: "Message image deleted successfully" });
    } catch (error) {
        console.error("deleteMessageMedia error:", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Failed to delete message image" });
    }
};