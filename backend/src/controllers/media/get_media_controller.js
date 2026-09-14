import "dotenv/config";
import {
    GetObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";
import mod_message from "../../models/mod_message.js";
import { STATUS_CODES } from "../../status_codes.js";

const streamObject = async (
    req,
    res,
    key,
    fallbackMimeType = "application/octet-stream"
) => {
    const range = req.headers.range;

    /*
     * No Range request:
     * normal image / full file response
     */
    if (!range) {
        const object = await minioClient.send(
            new GetObjectCommand({
                Bucket: process.env.MINIO_BUCKET,
                Key: key,
            })
        );

        res.setHeader(
            "Content-Type",
            object.ContentType || fallbackMimeType
        );

        res.setHeader(
            "Content-Disposition",
            "inline"
        );

        if (object.ContentLength !== undefined) {
            res.setHeader(
                "Content-Length",
                object.ContentLength
            );
        }

        res.setHeader(
            "Accept-Ranges",
            "bytes"
        );

        res.setHeader(
            "Cache-Control",
            "private, max-age=86400"
        );

        object.Body.pipe(res);

        return;
    }

    /*
     * Range request:
     * used especially by <video> for seeking
     */
    const head = await minioClient.send(
        new HeadObjectCommand({
            Bucket: process.env.MINIO_BUCKET,
            Key: key,
        })
    );

    const fileSize = head.ContentLength;

    if (fileSize === undefined) {
        throw new Error(
            "Could not determine media size"
        );
    }

    const match =
        range.match(/bytes=(\d*)-(\d*)/);

    if (!match) {
        return res
            .status(STATUS_CODES.ERROR.WEB_RANGE_NOT_SATISFIABLE)
            .send();
    }

    let start = match[1]
        ? Number(match[1])
        : 0;

    let end = match[2]
        ? Number(match[2])
        : fileSize - 1;

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

    const contentLength =
        end - start + 1;

    const object = await minioClient.send(
        new GetObjectCommand({
            Bucket: process.env.MINIO_BUCKET,
            Key: key,
            Range: `bytes=${start}-${end}`,
        })
    );

    res.status(STATUS_CODES.INFO.WEB_PARTIAL_CONTENT);

    res.setHeader(
        "Content-Type",
        object.ContentType ||
            head.ContentType ||
            fallbackMimeType
    );

    res.setHeader(
        "Content-Length",
        contentLength
    );

    res.setHeader(
        "Content-Range",
        `bytes ${start}-${end}/${fileSize}`
    );

    res.setHeader(
        "Accept-Ranges",
        "bytes"
    );

    res.setHeader(
        "Content-Disposition",
        "inline"
    );

    res.setHeader(
        "Cache-Control",
        "private, max-age=86400"
    );

    object.Body.pipe(res);
};

export const getProfileMedia = async (req, res) => {
    try {
        const userId =
            req.params.userId ||
            req.user._id;

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

        await streamObject(
            req,
            res,
            user.profilePicture
        );
    } catch (error) {
        console.error(
            "getProfileMedia error:",
            error
        );

        return res
            .status(
                STATUS_CODES.ERROR.WEB_NOT_FOUND
            )
            .json({
                message:
                    "Profile picture not found",
            });
    }
};

export const getMessageMedia = async (
    req,
    res
) => {
    try {
        const message =
            await mod_message.findById(
                req.params.messageId
            );

        if (!message || !message.media) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_NOT_FOUND
                )
                .json({
                    message:
                        "Message media not found",
                });
        }

        const userId =
            req.user._id.toString();

        if (
            message.senderId.toString() !==
                userId &&
            message.receiverId.toString() !==
                userId
        ) {
            return res
                .status(
                    STATUS_CODES.ERROR.WEB_UNAUTHORIZED
                )
                .json({
                    message: "Unauthorized",
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

        return res
            .status(
                STATUS_CODES.ERROR.WEB_NOT_FOUND
            )
            .json({
                message:
                    "Message media not found",
            });
    }
};