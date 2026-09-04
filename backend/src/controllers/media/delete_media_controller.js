import "dotenv/config";

import {
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import minioClient from "../../lib/minio.js";
import mod_user from "../../models/mod_user.js";

import { STATUS_CODES } from "../../status_codes.js";


// ----------------------------------------
// DELETE MEDIA
// ----------------------------------------

export const deleteMedia = async (req, res) => {
    try {
        // ----------------------------------------
        // 1. Get authenticated user
        // ----------------------------------------

        const userId = req.user._id;

        const bucketName = process.env.MINIO_BUCKET;

        if (!bucketName) {
            throw new Error("MINIO_BUCKET is not configured");
        }


        // ----------------------------------------
        // 2. Get current profile picture
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
        // 3. Nothing to delete
        // ----------------------------------------

        if (!user.profilePicture) {
            return res
                .status(STATUS_CODES.INFO.WEB_OK)
                .json({
                    message: "Profile picture already deleted",
                });
        }

        const oldFileKey = user.profilePicture;


        // ----------------------------------------
        // 4. Clear MongoDB first
        // ----------------------------------------

        await mod_user.findByIdAndUpdate(
            userId,
            {
                profilePicture: "",
            },
            {
                returnDocument: "after",
            }
        );


        // ----------------------------------------
        // 5. Delete object from MinIO
        // ----------------------------------------

        try {
            await minioClient.send(
                new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: oldFileKey,
                })
            );
        } catch (deleteError) {
            /*
             * MongoDB is already cleared.
             *
             * From the application's perspective, the user no longer
             * has a profile picture.
             *
             * If MinIO deletion fails, the file becomes an orphaned
             * object and can be cleaned up later.
             */

            console.error(
                "Failed to delete profile picture from MinIO:",
                deleteError
            );
        }


        // ----------------------------------------
        // 6. Send response
        // ----------------------------------------

        return res
            .status(STATUS_CODES.INFO.WEB_OK)
            .json({
                message: "Profile picture deleted successfully",
            });

    } catch (error) {

        console.error("deleteMedia error:", error);

        return res
            .status(STATUS_CODES.ERROR.SERVER_INTERNAL_ERROR)
            .json({
                message: "Failed to delete profile picture",
            });
    }
};