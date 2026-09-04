import "dotenv/config";
import minioClient from "../minio.js";

import {
    ListBucketsCommand
} from "@aws-sdk/client-s3";

try {
    const result = await minioClient.send(
        new ListBucketsCommand({})
    );

    console.log("Connected to MinIO!");
    console.log("Buckets:");

    for (const bucket of result.Buckets ?? []) {
        console.log(`- ${bucket.Name}`);
    }
} catch (error) {
    console.error("MinIO connection failed:");
    console.error(error);
}
