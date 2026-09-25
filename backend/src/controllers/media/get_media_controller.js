import "dotenv/config";
import {
    GetObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";
import mod_message from "../../models/mod_message.js";
import mod_group from "../../models/mod_group.js";
import { STATUS_CODES } from "../../status_codes.js";

const streamObject = async (
    req,
    res,
    key, // Location of the file in MinIO inside the bucket
    fallbackMimeType = "application/octet-stream" // What type to use if none is provided: Generic binary data
) => {
    // Allows to jump to a minute in the Video without the Broswer needing to download the whole
    const range = req.headers.range; 

    /*
     * No Range? Download the entire object
     */
    if (!range) {
        const object = await minioClient.send(
            new GetObjectCommand({
                Bucket: process.env.MINIO_BUCKET,
                Key: key,
            })
        );

        // Tells the browser what file it is
        res.setHeader(
            "Content-Type",
            object.ContentType || fallbackMimeType
        );

        // Try to display/play the file rather than forcing the user to download it.
        // An image can be displayed directly
        // attachment: download the file
        // inline: display if possible
        res.setHeader(
            "Content-Disposition",
            "inline"
        );

        // Tells the browser how many bytes are being sent
        if (object.ContentLength !== undefined) {
            res.setHeader(
                "Content-Length",
                object.ContentLength
            );
        }

        // Tells the browser that this server supports byte-range requests
        res.setHeader(
            "Accept-Ranges",
            "bytes"
        );

        // This tells the browser to cache the response for 24 hours
        // Private means it can be cached by a private client/browser cache, but generally not by shared caches
        res.setHeader(
            "Cache-Control",
            "private, max-age=86400"
        );

        // Streaming of the file bit by bit
        object.Body.pipe(res);

        return;
    }

    /*
     * Head request: Sends only information about the file
     */
    const head = await minioClient.send(
        new HeadObjectCommand({
            Bucket: process.env.MINIO_BUCKET,
            Key: key,
        })
    );

    // The size of the file
    const fileSize = head.ContentLength;

    // If no range, error because large files should not be processed
    if (fileSize === undefined) {
        throw new Error(
            "Could not determine media size"
        );
    }

    // Math range from start to end
    const match = range.match(/bytes=(\d*)-(\d*)/);

    // If range doesn´t have the expedted format retur
    if (!match) {
        return res
            .status(STATUS_CODES.ERROR.WEB_RANGE_NOT_SATISFIABLE)
            .send();
    }

    // Calculate start range
    let start = match[1] ? Number(match[1]) : 0;

    // Calculate end range
    let end = match[2] ? Number(match[2]) : fileSize - 1;

    // Check for the file to be withing the expected range
    if (
        start >= fileSize ||
        end >= fileSize ||
        start > end
    ) {
        res.setHeader(
            "Content-Range",
            `bytes */${fileSize}`
        );

        return res
            .status(STATUS_CODES.ERROR.WEB_RANGE_NOT_SATISFIABLE)
            .send();
    }

    // Calculate the response size + 1 because both endpoints are inclusive
    const contentLength = end - start + 1;

    // Ask minio only for that byte section
    const object = await minioClient.send(
        new GetObjectCommand({
            Bucket: process.env.MINIO_BUCKET,
            Key: key,
            Range: `bytes=${start}-${end}`,
        })
    );

    // MinIO sends only a part of the content
    res.status(STATUS_CODES.INFO.WEB_PARTIAL_CONTENT);

    // Send the Content-Type as e.g.: video/mp4
    res.setHeader(
        "Content-Type",
        object.ContentType ||
            head.ContentType ||
            fallbackMimeType
    );

    // The size of the response, not the entire file
    res.setHeader(
        "Content-Length",
        contentLength
    );

    // Tells the broswer it received bytes start through end from a certain file size
    res.setHeader(
        "Content-Range",
        `bytes ${start}-${end}/${fileSize}`
    );

    // Tells the browser that byte-range requests are supported
    res.setHeader(
        "Accept-Ranges",
        "bytes"
    );

    // Let the browser display the media
    res.setHeader(
        "Content-Disposition",
        "inline"
    );

    // This tells the browser to cache the response for 24 hours
    // Private means it can be cached by a private client/browser cache, but generally not by shared caches
    res.setHeader(
        "Cache-Control",
        "private, max-age=86400"
    );

    // Streaming of the file bit by bit
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
                .status(
                    STATUS_CODES.ERROR.WEB_NOT_FOUND
                )
                .json({
                    message: "User not found",
                });
        }

        if (!user.profilePicture) {
            return res
                .status(
                    STATUS_CODES.INFO.WEB_NO_CONTENT
                )
                .send();
        }

        await streamObject(req, res, user.profilePicture);
    } catch (error) {
        console.error(
            "getProfileMedia error:",
            error
        );

        if (res.status === STATUS_CODES.ERROR.WEB_NOT_FOUND) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_NOT_FOUND
                )
                .json({
                    message:
                        "Profile picture not found",
                });
        } else if (res.status === STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR) {
            return res
                .status(
                    STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR
                )
                .json({
                    message:
                        "Internal server error",
                });
        }
    }
};

export const getMessageMedia = async (req, res) => {
    try {
        // Get the message is e.g.: GET /messages/abc123/media -> abc123
        const message =
            await mod_message.findById(
                req.params.messageId
            );

        // Check that the media or message exists
        if (!message) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_NOT_FOUND
                )
                .json({
                    message:
                        "Message not found",
                });
        }

        if (!message.media) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_NOT_FOUND
                )
                .json({
                    message:
                        "Media not found in message",
                });
        }

        const userId = req.user._id.toString();

        // If the logged-in user is neither the sender nor the receiver, deny access
        let authorized =
            message.senderId.toString() === userId ||
            message.receiverId?.toString() === userId;

        if (message.groupId) {
            const group = await mod_group
                .findOne({
                    _id: message.groupId,
                    members: req.user._id,
                })
                .select("messageVisibility");

            if (!group) {
                authorized = false;
            } else {
                const visibilityEntry = (
                    group.messageVisibility || []
                ).find(
                    (item) =>
                        item.memberId?.toString() ===
                        req.user._id.toString()
                );

                const visibleFrom =
                    visibilityEntry?.visibleFrom || null;

                authorized =
                    !visibleFrom ||
                    message.createdAt >= visibleFrom;
            }
        }

        if (!authorized) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_FORBIDDEN
                )
                .json({
                    message: "Forbidden access",
                });
        }

        await streamObject(
            req,
            res,
            message.media,
            message.mediaMimeType
        );
    } catch (error) {
        console.error(
            "getMessageMedia error:",
            error
        );

        if (res.status === STATUS_CODES.ERROR.WEB_NOT_FOUND) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_NOT_FOUND
                )
                .json({
                    message:
                        "Media not found",
                });
        } else if (res.status === STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR) {
            return res
                .status(
                    STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR
                )
                .json({
                    message:
                        "Internal server error",
                });
        }
    }
};