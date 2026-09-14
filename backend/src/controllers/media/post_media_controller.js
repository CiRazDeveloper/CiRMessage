import "dotenv/config";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";
import { STATUS_CODES } from "../../status_codes.js";
import { extensionMap } from "../../middlewares/mid_upload.js";

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
                    message: "Only images are allowed as profile pictures"
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

        const extension =
            extensionMap[req.file.mimetype];

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
                Bucket:
                    process.env.MINIO_BUCKET,
                Key: imageKey,
                Body: req.file.buffer,
                ContentType:
                    req.file.mimetype,
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