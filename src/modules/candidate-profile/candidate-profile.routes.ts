import express from "express";
import multer, { MulterError } from "multer";
import { StatusCodes } from "http-status-codes";
import authenticate from "../../middlewares/authenticate.ts";
import schemaValidate from "../../middlewares/schemaValidate.ts";
import { ApiError } from "../../utils/index.ts";
import { candidateProfileController } from "./candidate-profile.module.ts";
import { candidateProfileCreateSchema, candidateProfileUpdateSchema } from "./candidate-profile.schema.ts";
import { RESUME_UPLOAD } from "./candidate-profile.constants.ts";

const router = express.Router();

const resumeUploadMiddleware = multer({
    // Resumes are small (capped at 5MB), so buffering in memory is simpler and avoids temp-file cleanup.
    storage: multer.memoryStorage(),
    limits: { fileSize: RESUME_UPLOAD.MAX_SIZE_BYTES, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (!RESUME_UPLOAD.MIMETYPES.some((mimetype) => mimetype === file.mimetype)) {
            return callback(new ApiError(StatusCodes.UNSUPPORTED_MEDIA_TYPE, "Resume must be a PDF, DOC or DOCX file"));
        }
        callback(null, true);
    },
}).single(RESUME_UPLOAD.FIELD_NAME);

/** Multer reports its own error type; without this it would surface as a 500 from the global handler. */
const handleResumeUpload: express.RequestHandler = (req, res, next) => {
    resumeUploadMiddleware(req, res, (error: unknown) => {
        if (!error) return next();

        if (error instanceof MulterError) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? `Resume must be at most ${Math.floor(RESUME_UPLOAD.MAX_SIZE_BYTES / (1024 * 1024))}MB`
                : error.message;

            return next(new ApiError(StatusCodes.BAD_REQUEST, message));
        }

        return next(error);
    });
};

router.get("/", authenticate, candidateProfileController.getProfile);
router.post("/", authenticate, schemaValidate(candidateProfileCreateSchema), candidateProfileController.createProfile);
router.patch("/", authenticate, schemaValidate(candidateProfileUpdateSchema), candidateProfileController.updateProfile);
router.delete("/", authenticate, candidateProfileController.deleteProfile);
router.get("/completion", authenticate, candidateProfileController.getCompletion);

router.post("/resume", authenticate, handleResumeUpload, candidateProfileController.uploadResume);

export default router;
