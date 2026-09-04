import "dotenv/config";

import minioClient from "../minio.js";

import {
    PutObjectCommand,
    GetObjectCommand
} from "@aws-sdk/client-s3";

const fileContent = Buffer.from("Hello from CiRMessage!");

const fileKey = "test/hello.txt";

try {
    await minioClient.send(
        new PutObjectCommand({
            Bucket: process.env.MINIO_BUCKET,
            Key: fileKey,
            Body: fileContent,
            ContentType: "text/plain",
        })
    );

    console.log("File uploaded successfully!");
    console.log(`Key: ${fileKey}`);
} catch (error) {
    console.error("Upload failed:");
    console.error(error);
}
