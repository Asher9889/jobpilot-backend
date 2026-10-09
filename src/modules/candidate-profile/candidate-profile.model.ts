import mongoose, { Document, Schema, model, Types } from "mongoose";
import { PROFILE_COMPLETION_STATUS, SKILL_PROFICIENCY_LEVELS, WORK_MODE } from "./candidate-profile.constants.ts";
import { ProfileCompletionResult, TSkillProficiencyLevel, TWorkMode, TProfileCompletionStatus } from "./candidate-profile.types.ts";


export interface ICandidateProfile extends Document {
  userId: mongoose.Types.ObjectId;

  headline: string | null;
  summary: string | null;

  skills: {
    name: string;
    level: TSkillProficiencyLevel | null;
  }[];

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

  profileCompletion: {
    percentage: number;
    status: TProfileCompletionStatus;
  };

  createdAt: Date;
  updatedAt: Date;

  calculateProfileCompletion(): ProfileCompletionResult;
}

const candidateProfileSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },

    headline: {
        type: String,
        trim: true,
        default: null,
    },

    summary: {
        type: String,
        trim: true,
        default: null,
    },

    skills: [
        {
            _id: false,
            name: {
                type: String,
                required: true,
                trim: true,
            },
            level: {
                type: String,
                enum: Object.values(SKILL_PROFICIENCY_LEVELS),
                default: null,
            },
        },
    ],

    experience: {
        _id: false,
        totalYears: {
            type: Number,
            min: 0,
            default: null,
        },
        currentRole: {
            type: String,
            trim: true,
            default: null,
        },
        previousRoles: {
            type: [String],
            default: [],
        },
    },

    education: [
        {
            _id: false,
            institution: {
                type: String,
                trim: true,
                default: null,
            },
            degree: {
                type: String,
                trim: true,
                default: null,
            },
            fieldOfStudy: {
                type: String,
                trim: true,
                default: null,
            },
            graduationYear: {
                type: Number,
                default: null,
            },
        },
    ],

    preferences: {
        _id: false,
        preferredRoles: {
            type: [String],
            default: [],
        },
        preferredLocations: {
            type: [String],
            default: [],
        },
        workModes: {
            type: [String],
            enum: Object.values(WORK_MODE),
            default: [],
        },
        employmentTypes: {
            type: [String],
            default: [],
        },
        minSalary: {
            type: Number,
            min: 0,
            default: null,
        },
    },

    resumeObjectKey: {
        type: String,
        default: null,
    },

    profileCompletion: {
        percentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
        status: {
            type: String,
            enum: Object.values(PROFILE_COMPLETION_STATUS),
            default: PROFILE_COMPLETION_STATUS.INCOMPLETE,
        },
    },
},
    {
        timestamps: true,
        versionKey: false,
    }
);

candidateProfileSchema.index({ userId: 1 }, { unique: true });

candidateProfileSchema.methods.calculateProfileCompletion = function calculateProfileCompletion(): ProfileCompletionResult {
    let percentage = 0;

    // Basic information: 10%
    if (this.headline?.trim()) {
        percentage += 10;
    }

    // Skills: 25%
    if (this.skills?.length > 0) {
        percentage += 25;
    }

    // Experience: 25%
    if (this.experience?.totalYears != null) {
        percentage += 25;
    }

    // Education: 10%
    if (this.education?.length > 0) {
        percentage += 10;
    }

    // Job preferences: 15%
    if (this.preferences?.preferredRoles?.length! > 0 && this.preferences?.workModes?.length! > 0) {
        percentage += 15;
    }

    // Resume: 15%
    if (this.resumeObjectKey?.trim()) {
        percentage += 15;
    }

    return {
        percentage,
        status: percentage === 100
            ? PROFILE_COMPLETION_STATUS.COMPLETE
            : percentage > 0
                ? PROFILE_COMPLETION_STATUS.PARTIALLY_COMPLETE
                : PROFILE_COMPLETION_STATUS.INCOMPLETE,
    };
};

export const CandidateProfileModel = model<ICandidateProfile>("CandidateProfile", candidateProfileSchema, "candidates_profile");

/**
 * Profile section	Weight
Basic details and headline	10%
Skills	25%
Work experience	25%
Education	10%
Job preferences	15%
Resume uploaded	15%
Total	100%
 */