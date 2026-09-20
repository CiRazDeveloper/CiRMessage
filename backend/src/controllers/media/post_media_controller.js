import "dotenv/config";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";
import { STATUS_CODES } from "../../status_codes.js";
import { extensionMap } from "../../middlewares/mid_upload.js";

export class MediaUploadError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

export const postMessageMedia = async ({
    file,
    senderId,
    receiverId,
}) => {
    if (!file) {
        return undefined;
    }

    const extension = extensionMap[file.mimetype];

    if (!extension) {
        throw new MediaUploadError(
            "Unsupported media type",
            STATUS_CODES.ERROR.WEB_UNSUPPORTED_MEDIA_TYPE
        );
    }

    const sender = await mod_user
        .findById(senderId)
        .select("username");

    const receiver = await mod_user
        .findById(receiverId)
        .select("username");

    if (!sender || !receiver) {
        throw new MediaUploadError(
            "User not found",
            STATUS_CODES.ERROR.WEB_NOT_FOUND
        );
    }

    const safeUsername = sender.username.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
    );

    const safeReceiverUsername =
        receiver.username.replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        );

    const mediaKey =
        `users/${safeUsername}/messages/` +
        `${safeReceiverUsername}/` +
        `${crypto.randomUUID()}.${extension}`;

    await minioClient.send(
        new PutObjectCommand({
            Bucket: process.env.MINIO_BUCKET,
            Key: mediaKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        })
    );

    return {
        mediaKey,
        mediaType: file.mimetype.startsWith("video/")
            ? "video"
            : "image",
        mediaMimeType: file.mimetype,
    };
};

export const postMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({
                    message: "Image is required"
                });
        }

        if (!req.file.mimetype.startsWith("image/")) {
            return res
                .status(
                    STATUS_CODES.ERROR
                        .WEB_UNSUPPORTED_MEDIA_TYPE
                )
                .json({
                    message: "Only images are allowed"
                });
        }

        const user = await mod_user
            .findById(req.user._id)
            .select("username");

        if (!user) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({
                    message: "User not found"
                });
        }

        const extension = extensionMap[req.file.mimetype];

        if (!extension) {
            return res
                .status(
                    STATUS_CODES.ERROR
                        .WEB_UNSUPPORTED_MEDIA_TYPE
                )
                .json({
                    message: "Unsupported image type"
                });
        }

        const safeUsername =
            user.username.replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
            );

        const imageKey =
            `users/${safeUsername}/images/` +
            `${crypto.randomUUID()}.${extension}`;

        await minioClient.send(
            new PutObjectCommand({
                Bucket: process.env.MINIO_BUCKET,
                Key: imageKey,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            })
        );

        user.profilePicture = imageKey;
        await user.save();

        return res
            .status(STATUS_CODES.INFO.WEB_CREATED)
            .json({
                message:
                    "Image uploaded successfully",
                key: imageKey,
            });
    } catch (error) {
        console.error(
            "postMedia error:",
            error
        );

        return res
            .status(
                STATUS_CODES.ERROR
                    .SERVER_INTERNAL_ERROR
            )
            .json({
                message:
                    "Failed to upload image"
            });
    }
};