import {
    MAX_MEDIA_SIZE_BYTES,
    MAX_IMAGE_UPLOAD_BYTES,
    MAX_IMAGE_DIMENSION,
    JPEG_QUALITY_STEPS,
} from "../../../shared/shared_media.js";

export function getMaxMediaSize() {
    return MAX_MEDIA_SIZE_BYTES;
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not read the selected image"));
        };
        image.src = objectUrl;
    });
}

function createImageBitmapFromFile(file) {
    if (typeof createImageBitmap === "function") {
        return createImageBitmap(file);
    }

    return loadImage(file);
}

function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("Could not process the selected image"));
                    return;
                }

                resolve(blob);
            },
            "image/jpeg",
            quality
        );
    });
}

export async function prepareMediaForUpload(file) {
    if (
        !file.type.startsWith("image/") ||
        file.size <= MAX_IMAGE_UPLOAD_BYTES
    ) {
        return file;
    }

    const image = await createImageBitmapFromFile(file);
    const sourceWidth = image.width;
    const sourceHeight = image.height;
    const scale = Math.min(
        1,
        MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) {
        image.close?.();
        throw new Error("Could not process the selected image");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close?.();

    for (const quality of JPEG_QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);

        if (blob.size <= MAX_IMAGE_UPLOAD_BYTES) {
            return new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                {
                    type: "image/jpeg",
                    lastModified: file.lastModified,
                }
            );
        }
    }

    return new File(
        [
            await canvasToBlob(
                canvas,
                JPEG_QUALITY_STEPS[
                    JPEG_QUALITY_STEPS.length - 1
                ]
            ),
        ],
        file.name.replace(/\.[^/.]+$/, "") + ".jpg",
        {
            type: "image/jpeg",
            lastModified: file.lastModified,
        }
    );
}