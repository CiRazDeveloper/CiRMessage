import multer from "multer";

const storage = multer.memoryStorage();

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
        fileSize: 100 * 1024 * 1024,
    },
});

export default upload;