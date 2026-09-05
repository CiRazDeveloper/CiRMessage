import "dotenv/config";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";
import mod_message from "../../models/mod_message.js";
import { STATUS_CODES } from "../../status_codes.js";

const streamObject = async (res, key) => {
    const object = await minioClient.send(
        new GetObjectCommand({
            Bucket: process.env.MINIO_BUCKET,
            Key: key,
        })
    );

    res.setHeader("Content-Type", object.ContentType || "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=\"message-image\"");

    if (object.ContentLength !== undefined) {
        res.setHeader("Content-Length", object.ContentLength);
    }

    res.setHeader("Cache-Control", "private, max-age=86400");
    object.Body.pipe(res);
};

export const getProfileMedia = async (req, res) => {
    try {
        const userId = req.params.userId || req.user._id;

        const user = await mod_user
            .findById(userId)
            .select("profilePicture");

        if (!user) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "User not found" });
        }

        if (!user.profilePicture) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "Profile picture not found" });
        }

        await streamObject(res, user.profilePicture);
    } catch (error) {
        console.error("getProfileMedia error:", error);

        return res
            .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
            .json({ message: "Profile picture not found" });
    }
};

export const getMessageMedia = async (req, res) => {
    try {
        const message = await mod_message.findById(req.params.messageId);

        if (!message || !message.image) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({ message: "Message image not found" });
        }

        const userId = req.user._id.toString();

        if (
            message.senderId.toString() !== userId &&
            message.receiverId.toString() !== userId
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_UNAUTHORIZED)
                .json({ message: "Unauthorized" });
        }

        await streamObject(res, message.image);
    } catch (error) {
        console.error("getMessageMedia error:", error);

        return res
            .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
            .json({ message: "Message image not found" });
    }
};