import { S3Client } from "@aws-sdk/client-s3";
import { envConfig } from "../../config/index.ts";

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: envConfig.minio.endPoint,        // e.g. "http://160.25.62.109:9000"
    credentials: {
        accessKeyId: envConfig.minio.accessKey,
        secretAccessKey: envConfig.minio.secretKey,
    },
    forcePathStyle: true,
});

export default s3Client;