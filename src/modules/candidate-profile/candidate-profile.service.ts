import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../utils/index.ts";
import { logger } from "../../config/index.ts";
import type { IUser } from "../user/user.model.ts";
import minioService from "../storage/s3.service.ts";
import CandidateProfileModel from "./candidate-profile.model.ts";
import type { ICandidateProfile } from "./candidate-profile.model.ts";
import type {
    ProfileCompletionResult,
    TCandidateProfileResponse,
    TCreateCandidateProfileDTO,
    TEducationItemInput,
    TExperienceInput,
    TPreferencesInput,
    TSkillInput,
    TUpdateCandidateProfileDTO,
} from "./candidate-profile.types.ts";

const isDuplicateKeyError = (error: unknown): boolean => {
    const code = (error as { code?: number } | null)?.code;
    const writeErrors = (error as { writeErrors?: Array<{ code?: number }> } | null)?.writeErrors;
    return code === 11000 || Boolean(writeErrors?.some((entry) => entry.code === 11000));
};

type TDetectedResumeType = { extension: ".pdf" | ".docx" | ".doc"; mimetype: string };

/** Content-Type is client-supplied and trivially spoofed, so the real type is read from the file's magic bytes. */
const RESUME_SIGNATURES: { bytes: number[]; type: TDetectedResumeType }[] = [
    { bytes: [0x25, 0x50, 0x44, 0x46], type: { extension: ".pdf", mimetype: "application/pdf" } },
    { bytes: [0x50, 0x4b, 0x03, 0x04], type: { extension: ".docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } },
    { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], type: { extension: ".doc", mimetype: "application/msword" } },
];

const detectResumeType = (buffer: Buffer): TDetectedResumeType | null => {
    for (const { bytes, type } of RESUME_SIGNATURES) {
        if (buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte)) {
            return type;
        }
    }
    return null;
};

class CandidateProfileService {
    /** Client-supplied `profileCompletion` is never trusted; it is recomputed from the stored document on every write. */
    getProfile = async (loggedInUser: IUser): Promise<TCandidateProfileResponse> => {
        const existing = await CandidateProfileModel.findOne({ userId: loggedInUser._id });

        if (existing) {
            return this.toResponse(existing);
        }

        const profile = new CandidateProfileModel({ userId: loggedInUser._id });
        profile.profileCompletion = profile.calculateProfileCompletion();
        await profile.save();

        logger.info({ userId: String(loggedInUser._id), percentage: profile.profileCompletion.percentage }, "Created blank candidate profile");

        return this.toResponse(profile);
    };

    createProfile = async (loggedInUser: IUser, dto: TCreateCandidateProfileDTO): Promise<TCandidateProfileResponse> => {
        const existing = await CandidateProfileModel.exists({ userId: loggedInUser._id });

        if (existing) {
            throw new ApiError(StatusCodes.CONFLICT, "Candidate profile already exists for this user");
        }

        try {
            const profile = new CandidateProfileModel({
                userId: loggedInUser._id,
                headline: dto.headline ?? null,
                summary: dto.summary ?? null,
                skills: this.normalizeSkills(dto.skills),
                experience: this.resolveExperienceInput(dto.experience),
                education: this.normalizeEducation(dto.education),
                preferences: this.resolvePreferencesInput(dto.preferences),
            });

            profile.profileCompletion = profile.calculateProfileCompletion();
            await profile.save();

            logger.info({ userId: String(loggedInUser._id), percentage: profile.profileCompletion.percentage }, "Candidate profile created");

            return this.toResponse(profile);
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ApiError(StatusCodes.CONFLICT, "Candidate profile already exists for this user");
            }
            throw error;
        }
    };

    updateProfile = async (loggedInUser: IUser, dto: TUpdateCandidateProfileDTO): Promise<TCandidateProfileResponse> => {
        const profile = await CandidateProfileModel.findOne({ userId: loggedInUser._id });

        if (!profile) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Candidate profile not found");
        }

        if (dto.headline !== undefined) profile.headline = dto.headline;
        if (dto.summary !== undefined) profile.summary = dto.summary;
        if (dto.skills !== undefined) profile.skills = this.normalizeSkills(dto.skills);
        if (dto.education !== undefined) profile.education = this.normalizeEducation(dto.education);

        if (dto.experience !== undefined) {
            const incoming = dto.experience;
            if (incoming.totalYears !== undefined) profile.experience.totalYears = incoming.totalYears;
            if (incoming.currentRole !== undefined) profile.experience.currentRole = incoming.currentRole;
            if (incoming.previousRoles !== undefined) profile.experience.previousRoles = incoming.previousRoles;
        }

        if (dto.preferences !== undefined) {
            const incoming = dto.preferences;
            if (incoming.preferredRoles !== undefined) profile.preferences.preferredRoles = incoming.preferredRoles;
            if (incoming.preferredLocations !== undefined) profile.preferences.preferredLocations = incoming.preferredLocations;
            if (incoming.workModes !== undefined) profile.preferences.workModes = incoming.workModes;
            if (incoming.employmentTypes !== undefined) profile.preferences.employmentTypes = incoming.employmentTypes;
            if (incoming.minSalary !== undefined) profile.preferences.minSalary = incoming.minSalary;
        }

        profile.profileCompletion = profile.calculateProfileCompletion();
        await profile.save();

        logger.info({ userId: String(loggedInUser._id), percentage: profile.profileCompletion.percentage }, "Candidate profile updated");

        return this.toResponse(profile);
    };

    deleteProfile = async (loggedInUser: IUser): Promise<null> => {
        const result = await CandidateProfileModel.deleteOne({ userId: loggedInUser._id });

        if (result.deletedCount === 0) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Candidate profile not found");
        }

        logger.info({ userId: String(loggedInUser._id) }, "Candidate profile deleted");

        return null;
    };

    getCompletion = async (loggedInUser: IUser): Promise<ProfileCompletionResult> => {
        const profile = await CandidateProfileModel.findOne({ userId: loggedInUser._id });

        if (!profile) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Candidate profile not found");
        }

        return profile.calculateProfileCompletion();
    };

    uploadResume = async (loggedInUser: IUser, file: Express.Multer.File): Promise<TCandidateProfileResponse> => {
        const profile = await CandidateProfileModel.findOne({ userId: loggedInUser._id });

        if (!profile) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Candidate profile not found");
        }

        if (!file.buffer?.length) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Resume file is required");
        }

        const detected = detectResumeType(file.buffer);

        if (!detected) {
            throw new ApiError(StatusCodes.UNSUPPORTED_MEDIA_TYPE, "Resume must be a PDF, DOC or DOCX file");
        }

        // The extension comes from the sniffed content, never from the client-supplied filename.
        const objectKey = `resumes/${String(loggedInUser._id)}/${randomUUID()}${detected.extension}`;
        const previousKey = profile.resumeObjectKey;

        await minioService.sendFileToMinio({ ...file, mimetype: detected.mimetype }, objectKey);

        profile.resumeObjectKey = objectKey;
        profile.profileCompletion = profile.calculateProfileCompletion();
        await profile.save();

        if (previousKey && previousKey !== objectKey) {
            void minioService.deleteFileFromMinio(previousKey);
        }

        logger.info({ userId: String(loggedInUser._id), objectKey, percentage: profile.profileCompletion.percentage }, "Resume uploaded");

        return this.toResponse(profile);
    };

    /** Case-insensitive de-duplication; the first occurrence wins and later duplicates are dropped. */
    private normalizeSkills = (skills: TSkillInput[]): ICandidateProfile["skills"] => {
        const seen = new Set<string>();
        const normalized: ICandidateProfile["skills"] = [];

        for (const skill of skills) {
            const key = skill.name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            normalized.push({ name: skill.name, level: skill.level ?? null });
        }

        return normalized;
    };

    private normalizeEducation = (items: TEducationItemInput[]): ICandidateProfile["education"] =>
        items.map((item) => ({
            institution: item.institution ?? null,
            degree: item.degree ?? null,
            fieldOfStudy: item.fieldOfStudy ?? null,
            graduationYear: item.graduationYear ?? null,
        }));

    /** `null` means "explicitly cleared", so it must survive; only `undefined` falls back to the default. */
    private resolveExperienceInput = (input: TExperienceInput | undefined): ICandidateProfile["experience"] => ({
        totalYears: input?.totalYears ?? null,
        currentRole: input?.currentRole ?? null,
        previousRoles: input?.previousRoles ?? [],
    });

    private resolvePreferencesInput = (input: TPreferencesInput | undefined): ICandidateProfile["preferences"] => ({
        preferredRoles: input?.preferredRoles ?? [],
        preferredLocations: input?.preferredLocations ?? [],
        workModes: input?.workModes ?? [],
        employmentTypes: input?.employmentTypes ?? [],
        minSalary: input?.minSalary ?? null,
    });

    private toResponse = (profile: ICandidateProfile): TCandidateProfileResponse => ({
        id: profile._id,
        userId: profile.userId,
        headline: profile.headline,
        summary: profile.summary,
        skills: profile.skills.map((skill) => ({ name: skill.name, level: skill.level ?? null })),
        experience: {
            totalYears: profile.experience?.totalYears ?? null,
            currentRole: profile.experience?.currentRole ?? null,
            previousRoles: profile.experience?.previousRoles ?? [],
        },
        education: profile.education.map((item) => ({
            institution: item.institution ?? null,
            degree: item.degree ?? null,
            fieldOfStudy: item.fieldOfStudy ?? null,
            graduationYear: item.graduationYear ?? null,
        })),
        preferences: {
            preferredRoles: profile.preferences?.preferredRoles ?? [],
            preferredLocations: profile.preferences?.preferredLocations ?? [],
            workModes: profile.preferences?.workModes ?? [],
            employmentTypes: profile.preferences?.employmentTypes ?? [],
            minSalary: profile.preferences?.minSalary ?? null,
        },
        resumeObjectKey: profile.resumeObjectKey,
        profileCompletion: profile.profileCompletion,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    });
}

export default CandidateProfileService;
