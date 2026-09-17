import multer from "multer";
import { STATUS_CODES } from "../status_codes.js";
import {
    MAX_MEDIA_SIZE_BYTES,
    MAX_MEDIA_SIZE_MB,
} from "../../../shared/shared_media.js";

const storage = multer.memoryStorage();
export const MAX_UPLOAD_SIZE_BYTES =
    MAX_MEDIA_SIZE_BYTES;

export const extensionMap = {
    // Images
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",

    // Videos
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
};

const fileFilter = (req, file, cb) => {
    if (!extensionMap[file.mimetype]) {
        return cb(
            new Error(
                `Unsupported media type: ${file.mimetype}`
            )
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES,
    },
});

export function handleUploadError(error, req, res, next) {
    if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
    ) {
        return res
            .status(
                STATUS_CODES.ERROR.WEB_PAYLOAD_TOO_LARGE
            )
            .json({
            message:
                `Media file is too large. The maximum upload size is ${MAX_MEDIA_SIZE_MB} MB.`,
            });
    }

    next(error);
}

export default upload;