import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { StatusCodes } from "http-status-codes";
import s3Client from "./s3.client.ts";
import { envConfig, logger } from "../../config/index.ts";
import { ApiError } from "../../utils/index.ts";

class MinioService {
    sendFileToMinio = async (
        file: Express.Multer.File,
        key: string,
        bucketName: string = envConfig.minio.bucketName,
    ): Promise<void> => {
        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));

            logger.info({ bucket: bucketName, key, size: file.size, contentType: file.mimetype }, "Uploaded file to MinIO");
        } catch (error) {
            logger.error({ bucket: bucketName, key, err: error }, "Failed to upload file to MinIO");
            throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to upload file to storage");
        }
    };

    /** Best-effort: a failed orphan cleanup must never fail the caller's primary action. */
    deleteFileFromMinio = async (key: string, bucketName: string = envConfig.minio.bucketName): Promise<void> => {
        try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
            logger.info({ bucket: bucketName, key }, "Deleted file from MinIO");
        } catch (error) {
            logger.warn({ bucket: bucketName, key, err: error }, "Failed to delete file from MinIO");
        }
    };
}

const minioService = new MinioService();

export default minioService;
