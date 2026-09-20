import "dotenv/config";

import mod_message from "../../models/mod_message.js";
import { STATUS_CODES } from "../../status_codes.js";
import { getIO } from "../../lib/socket.js";
import {
    MediaUploadError,
    postMessageMedia,
} from "../media/post_media_controller.js";

const validateText = (text) => {
    if (
        typeof text === "string" &&
        text.length > 2000
    ) {
        return "Text must not exceed 2000 characters";
    }

    return null;
};

const enforceMessageRequest = async (
    senderId,
    receiverId
) => {
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

    if (!firstMessage) {
        return;
    }

    const initiatorId =
        firstMessage.senderId.toString();

    const recipientId =
        firstMessage.receiverId.toString();

    if (senderId.toString() !== initiatorId) {
        return;
    }

    const recipientHasReplied =
        await mod_message.exists({
            senderId: recipientId,
            receiverId: initiatorId,
        });

    if (!recipientHasReplied) {
        const error = new Error(
            "You can send only one message until this user replies to you."
        );
        error.code = "AWAITING_REPLY";
        error.statusCode =
            STATUS_CODES.ERROR.WEB_FORBIDDEN;
        throw error;
    }
};

const createMessage = async ({
    senderId,
    receiverId,
    text,
    media,
}) => {
    return mod_message.create({
        senderId,
        receiverId,
        text: text?.trim() || undefined,
        media: media?.mediaKey,
        mediaType: media?.mediaType,
        mediaMimeType: media?.mediaMimeType,
    });
};

const emitNewMessage = (receiverId, message) => {
    getIO()
        .to(`user:${receiverId}`)
        .emit("new-message", message);
};

export const sendMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        const textError = validateText(text);

        if (textError) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_BAD_REQUEST
                )
                .json({
                    message: textError,
                });
        }

        await enforceMessageRequest(
            senderId,
            receiverId
        );

        const media =
            await postMessageMedia({
                file: req.file,
                senderId,
                receiverId,
            });

        if (!text?.trim() && !media) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_BAD_REQUEST
                )
                .json({
                    message:
                        "Text or media is required",
                });
        }

        const message = await createMessage({
            senderId,
            receiverId,
            text,
            media,
        });

        emitNewMessage(receiverId, message);

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

        if (
            error instanceof MediaUploadError ||
            error.statusCode
        ) {
            return res
                .status(error.statusCode)
                .json({
                    ...(error.code && {
                        code: error.code,
                    }),
                    message: error.message,
                });
        }

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
