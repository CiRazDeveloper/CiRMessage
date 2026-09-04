import "dotenv/config";
import crypto from "crypto";

import {
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";

import { STATUS_CODES } from "../../status_codes.js";


// ----------------------------------------
// Delete objects in batches of 1,000
// ----------------------------------------

const deleteObjectsInBatches = async (bucketName, objects) => {
    const BATCH_SIZE = 1000;

    for (let i = 0; i < objects.length; i += BATCH_SIZE) {
        const batch = objects.slice(i, i + BATCH_SIZE);

        await minioClient.send(
            new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: {
                    Objects: batch,
                },
            })
        );
    }
};


// ----------------------------------------
// Get all objects under a prefix
// ----------------------------------------

const getAllObjects = async (bucketName, prefix) => {
    const objects = [];

    let continuationToken = undefined;

    do {
        const response = await minioClient.send(
            new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            })
        );

        for (const object of response.Contents ?? []) {
            if (object.Key) {
                objects.push({
                    Key: object.Key,
                });
            }
        }

        continuationToken =
            response.IsTruncated
                ? response.NextContinuationToken
                : undefined;

    } while (continuationToken);

    return objects;
};


// ----------------------------------------
// POST MEDIA
// ----------------------------------------

export const postMedia = async (req, res) => {
    let newFileKey = null;

    try {
        // ----------------------------------------
        // 1. Make sure a file was uploaded
        // ----------------------------------------

        if (!req.file) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({
                    message: "Profile picture is required",
                });
        }


        // ----------------------------------------
        // 2. Get authenticated user
        // ----------------------------------------

        const userId = req.user._id;
        const username = req.user.username;

        const bucketName = process.env.MINIO_BUCKET;

        if (!bucketName) {
            throw new Error("MINIO_BUCKET is not configured");
        }


        // ----------------------------------------
        // 3. Determine file extension
        // ----------------------------------------

        const extensionMap = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
        };

        const extension = extensionMap[req.file.mimetype];

        if (!extension) {
            return res
                .status(STATUS_CODES.ERROR.WEB_BAD_REQUEST)
                .json({
                    message: "Unsupported image type",
                });
        }


        // ----------------------------------------
        // 4. Generate unique MinIO object key
        // ----------------------------------------

        newFileKey =
            `${username}/pfp/${crypto.randomUUID()}.${extension}`;


        // ----------------------------------------
        // 5. Upload new profile picture
        // ----------------------------------------

        await minioClient.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: newFileKey,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            })
        );


        // ----------------------------------------
        // 6. Get all existing profile pictures
        // ----------------------------------------

        const allObjects = await getAllObjects(
            bucketName,
            `${username}/pfp/`
        );


        // ----------------------------------------
        // 7. Keep only old profile pictures
        // ----------------------------------------

        const oldObjects = allObjects.filter(
            (object) => object.Key !== newFileKey
        );


        // ----------------------------------------
        // 8. Update MongoDB BEFORE deleting old files
        // ----------------------------------------

        await mod_user.findByIdAndUpdate(
            userId,
            {
                profilePicture: newFileKey,
            },
            {
                returnDocument: "after"
            }
        );


        // ----------------------------------------
        // 9. Delete old profile pictures
        // ----------------------------------------

        if (oldObjects.length > 0) {
            try {
                await deleteObjectsInBatches(
                    bucketName,
                    oldObjects
                );
            } catch (deleteError) {
                /*
                 * The new profile picture is already stored in
                 * MongoDB, so we DON'T roll it back.
                 *
                 * The old files are harmless orphaned objects
                 * and can be cleaned up later.
                 */

                console.error(
                    "Failed to delete old profile pictures:",
                    deleteError
                );
            }
        }


        // ----------------------------------------
        // 10. Send response
        // ----------------------------------------

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json({
                message: "Profile picture uploaded successfully",
                profilePicture: newFileKey,
            });

    } catch (error) {

        console.error("postMedia error:", error);


        // ----------------------------------------
        // Rollback newly uploaded image
        // ----------------------------------------

        if (newFileKey) {
            try {
                await minioClient.send(
                    new DeleteObjectsCommand({
                        Bucket: process.env.MINIO_BUCKET,
                        Delete: {
                            Objects: [
                                {
                                    Key: newFileKey,
                                },
                            ],
                        },
                    })
                );

                console.log(
                    `Rolled back uploaded file: ${newFileKey}`
                );

            } catch (rollbackError) {
                console.error(
                    "Failed to rollback uploaded file:",
                    rollbackError
                );
            }
        }


        // ----------------------------------------
        // Send error response
        // ----------------------------------------

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({
                message: "Failed to upload profile picture",
            });
    }
};