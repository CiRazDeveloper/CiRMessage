import "dotenv/config";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import mod_message from "../../models/mod_message.js";
import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";
import { STATUS_CODES } from "../../status_codes.js";
import { getIO } from "../../lib/socket.js";

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

        if (
            typeof text === "string" &&
            text.length > 2000
        ) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_BAD_REQUEST
                )
                .json({
                    message:
                        "Text must not exceed 2000 characters",
                });
        }

        /*
         * MESSAGE REQUEST CHECK
         *
         * The user who started the conversation
         * may send only one message until the
         * recipient replies.
         */
        const firstMessage = await mod_message
            .findOne({
                $or: [
                    {
                        senderId,
                        receiverId,
                    },
                    {
                        senderId: receiverId,
                        receiverId: senderId,
                    },
                ],
            })
            .sort({
                createdAt: 1,
            })
            .select(
                "senderId receiverId"
            );

        if (firstMessage) {
            const initiatorId =
                firstMessage.senderId.toString();

            const recipientId =
                firstMessage.receiverId.toString();

            const currentSenderId =
                senderId.toString();

            /*
             * Only check for a reply when the
             * current sender is the person who
             * originally started the chat.
             */
            if (
                currentSenderId === initiatorId
            ) {
                const recipientHasReplied =
                    await mod_message.exists({
                        senderId: recipientId,
                        receiverId: initiatorId,
                    });

                if (!recipientHasReplied) {
                    return res
                        .status(
                            STATUS_CODES.ERROR.WEB_FORBIDDEN
                        )
                        .json({
                            code: "AWAITING_REPLY",
                            message:
                                "You can send only one message until this user replies to you.",
                        });
                }
            }
        }

        /*
         * IMAGE UPLOAD
         *
         * This happens AFTER the message-request
         * check so rejected messages don't leave
         * unused images in MinIO.
         */
        let imageKey;

        if (req.file) {
            const extension =
                extensionMap[req.file.mimetype];

            if (!extension) {
                return res
                    .status(
                        STATUS_CODES.ERROR.WEB_UNSUPPORTED_MEDIA_TYPE
                    )
                    .json({
                        message: "Unsupported image type",
                    });
            }

            const sender = await mod_user
                .findById(req.user._id)
                .select("username");

            const receiver = await mod_user
                .findById(receiverId)
                .select("username");

            if (!sender || !receiver) {
                return res
                    .status(
                        STATUS_CODES.ERROR
                            .WEB_NOT_FOUND
                    )
                    .json({
                        message:
                            "User not found",
                    });
            }

            const safeUsername =
                sender.username.replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                );

            const safeReceiverUsername =
                receiver.username.replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                );

            imageKey =
                `users/${safeUsername}/messages/` +
                `${safeReceiverUsername}/` +
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
        }

        if (!text?.trim() && !imageKey) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_BAD_REQUEST
                )
                .json({
                    message:
                        "Text or image is required",
                });
        }

        const message =
            await mod_message.create({
                senderId,
                receiverId,
                text:
                    text?.trim() ||
                    undefined,
                image: imageKey,
            });

        const io = getIO();

        io.to(`user:${receiverId}`).emit(
            "new-message",
            message
        );

        return res
            .status(
                STATUS_CODES.INFO.WEB_CREATED
            )
            .json(message);
    } catch (error) {
        console.error(
            "Error in sendMessage:",
            error
        );

        return res
            .status(
                STATUS_CODES.ERROR
                    .SERVER_INTERNAL_ERROR
            )
            .json({
                message:
                    "Internal Server Error",
            });
    }
};