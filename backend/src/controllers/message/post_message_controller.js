import "dotenv/config";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import mod_message from "../../models/mod_message.js";
import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";
import { STATUS_CODES } from "../../status_codes.js";

const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
};

export const sendMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        if (typeof text === "string" && text.length > 2000) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Text must not exceed 2000 characters" });
        }

        let imageKey;

        if (req.file) {
            const extension = extensionMap[req.file.mimetype];

            if (!extension) {
                return res
                    .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                    .json({ message: "Unsupported image type" });
            }

            const sender = await mod_user
                .findById(req.user._id)
                .select("username");

            const receiver = await mod_user
                .findById(receiverId)
                .select("username");

            if (!sender || !receiver) {
                return res
                    .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                    .json({ message: "User not found" });
            }

            const safeUsername = sender.username.replace(/[^a-zA-Z0-9_-]/g, "_");

            const safeReceiverUsername = receiver.username.replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
            );

            imageKey = `users/${safeUsername}/messages/${safeReceiverUsername}/` +
                `${crypto.randomUUID()}.${extension}`;

            await minioClient.send(
                new PutObjectCommand({
                    Bucket: process.env.MINIO_BUCKET,
                    Key: imageKey,
                    Body: req.file.buffer,
                    ContentType: req.file.mimetype,
                })
            );
        }

        if (!text?.trim() && !imageKey) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({ message: "Text or image is required" });
        }

        const message = await mod_message.create({
            senderId,
            receiverId,
            text: text?.trim() || undefined,
            image: imageKey,
        });

        return res
            .status(STATUS_CODES.INFO.WEB_CREATED)
            .json(message);
    } catch (error) {
        console.error("Error in sendMessage:", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({ message: "Internal Server Error" });
    }
};