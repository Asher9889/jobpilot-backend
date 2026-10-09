export const SKILL_PROFICIENCY_LEVELS = {
    "BEGINNER": "BEGINNER",
    "INTERMEDIATE": "INTERMEDIATE",
    "ADVANCED": "ADVANCED",
    "EXPERT": "EXPERT"
} as const;

export const WORK_MODE = {
    "REMOTE": "REMOTE",
    "HYBRID": "HYBRID",
    "ONSITE": "ONSITE"
} as const;

export const PROFILE_COMPLETION_STATUS = {
    "INCOMPLETE": "INCOMPLETE",
    "PARTIALLY_COMPLETE": "PARTIALLY_COMPLETE",
    "COMPLETE": "COMPLETE"
} as const;

export const RESUME_UPLOAD = {
    FIELD_NAME: "resume",
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    MIMETYPES: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
} as const;