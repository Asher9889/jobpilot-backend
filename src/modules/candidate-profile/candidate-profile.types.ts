import z from "zod";
import { PROFILE_COMPLETION_STATUS, SKILL_PROFICIENCY_LEVELS, WORK_MODE } from "./candidate-profile.constants.ts";
import {
    candidateProfileCreateSchema,
    candidateProfileUpdateSchema,
    educationItemSchema,
    experienceCreateSchema,
    preferencesCreateSchema,
    skillSchema,
} from "./candidate-profile.schema.ts";

export type TSkillProficiencyLevel = (typeof SKILL_PROFICIENCY_LEVELS)[keyof typeof SKILL_PROFICIENCY_LEVELS];
export type TWorkMode = (typeof WORK_MODE)[keyof typeof WORK_MODE];
export type TProfileCompletionStatus = (typeof PROFILE_COMPLETION_STATUS)[keyof typeof PROFILE_COMPLETION_STATUS];

export interface ProfileCompletionResult {
  percentage: number;
  status: TProfileCompletionStatus;
}

export type TCreateCandidateProfileDTO = z.infer<typeof candidateProfileCreateSchema>;
export type TUpdateCandidateProfileDTO = z.infer<typeof candidateProfileUpdateSchema>;

export type TSkillInput = z.infer<typeof skillSchema>;
export type TEducationItemInput = z.infer<typeof educationItemSchema>;
export type TExperienceInput = z.infer<typeof experienceCreateSchema>;
export type TPreferencesInput = z.infer<typeof preferencesCreateSchema>;

export interface TCandidateProfileResponse {
    id: unknown;
    userId: unknown;
    headline: string | null;
    summary: string | null;
    skills: { name: string; level: TSkillProficiencyLevel | null }[];
    experience: {
        totalYears: number | null;
        currentRole: string | null;
        previousRoles: string[];
    };
    education: {
        institution: string | null;
        degree: string | null;
        fieldOfStudy: string | null;
        graduationYear: number | null;
    }[];
    preferences: {
        preferredRoles: string[];
        preferredLocations: string[];
        workModes: TWorkMode[];
        employmentTypes: string[];
        minSalary: number | null;
    };
    resumeObjectKey: string | null;
    profileCompletion: ProfileCompletionResult;
    createdAt: Date;
    updatedAt: Date;
}
