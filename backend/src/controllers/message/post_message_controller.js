import "dotenv/config";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import mod_message from "../../models/mod_message.js";
import minioClient from "../../lib/minio.js";
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

        let imageKey;

        if (req.file) {
            const extension = extensionMap[req.file.mimetype];

            if (!extension) {
                return res
                    .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                    .json({ message: "Unsupported image type" });
            }

            imageKey = `messages/${crypto.randomUUID()}.${extension}`;

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