import "dotenv/config";

import {
    GetObjectCommand,
} from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";

import { STATUS_CODES } from "../../status_codes.js";

export const getMedia = async (req, res) => {
    try {
        // ----------------------------------------
        // 1. Determine which user to retrieve
        // ----------------------------------------

        const userId = req.params.userId || req.user._id;

        const bucketName = process.env.MINIO_BUCKET;

        if (!bucketName) {
            throw new Error("MINIO_BUCKET is not configured");
        }

        // ----------------------------------------
        // 2. Find user
        // ----------------------------------------

        const user = await mod_user
            .findById(userId)
            .select("profilePicture");

        if (!user) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({
                    message: "User not found",
                });
        }

        // ----------------------------------------
        // 3. Make sure profile picture exists
        // ----------------------------------------

        if (!user.profilePicture) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({
                    message: "Profile picture not found",
                });
        }

        // ----------------------------------------
        // 4. Get image from MinIO
        // ----------------------------------------

        const object = await minioClient.send(
            new GetObjectCommand({
                Bucket: bucketName,
                Key: user.profilePicture,
            })
        );

        if (!object.Body) {
            throw new Error("MinIO returned an empty object");
        }

        // ----------------------------------------
        // 5. Set response headers
        // ----------------------------------------

        res.setHeader(
            "Content-Type",
            object.ContentType || "application/octet-stream"
        );

        if (object.ContentLength !== undefined) {
            res.setHeader(
                "Content-Length",
                object.ContentLength
            );
        }

        res.setHeader(
            "Cache-Control",
            "private, max-age=86400"
        );

        // ----------------------------------------
        // 6. Stream image to client
        // ----------------------------------------

        object.Body.pipe(res);

    } catch (error) {
        console.error("getMedia error:", error);

        if (
            error.name === "NoSuchKey" ||
            error.$metadata?.httpStatusCode === 404
        ) {
            return res
                .status(STATUS_CODES.ERROR.WEB_NOT_FOUND)
                .json({
                    message: "Profile picture not found",
                });
        }

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({
                message: "Failed to retrieve profile picture",
            });
    }
};