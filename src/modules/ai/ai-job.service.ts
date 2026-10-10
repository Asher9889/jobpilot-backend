import { } from "ollama";
import { JOB_CLASSIFICATION_PROMPT, JOB_MATCHING_PROMPT } from "./prompts/job-classification.prompt.ts";
import { envConfig, logger } from "../../config/index.ts";
import { ollamaClient } from "./providers/ollama.ts";
import { extractedJobSchema } from "./ai-extracted-job.schema.ts";
import { TExtractedJob } from "./ai.types.ts";
import { JobMatchingPayload } from "../job-matching/index.ts";
import JobModel from "../jobs/jobs.model.ts";
import { UserModel } from "../user/index.ts";
import { CandidateProfileModel } from "../candidate-profile/index.ts";
import { jobMatchResultSchema } from "../job-matching/job-matching.schema.ts";

class AIService {
    private readonly ollama: typeof ollamaClient;

    constructor(ollama: typeof ollamaClient) {
        this.ollama = ollama;
    }


    classifyJob = async (jobMessage: string) => {
        try {
            console.log("Classifying job message:", jobMessage);
            const response = await this.ollama.systemone({
                model: 'tev1:0.8b',
                state: jobMessage,
                questions: {
                    is_job_posting: {
                        type: "noul",
                        ...JOB_CLASSIFICATION_PROMPT
                    }
                }
            })
            console.log("Response:", response.answers.is_job_posting);

            return response.answers.is_job_posting as unknown as { type: "noul", noul: number };

        } catch (error) {
            logger.error({ err: error }, "Error classifying job message");
            throw error;
        }
    }

    jobToJson = async (jobMessage: string): Promise<TExtractedJob> => {
        try {
            const response = await this.ollama.chat({
                "model": envConfig.models.qwen2_5_7b,
                "stream": false,
                "think": false,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a job posting extraction assistant. Extract job information only from the supplied message. Return JSON matching the provided schema. Do not invent information. Use null for missing scalar values and empty arrays for missing lists. Preserve multiple job roles. Distinguish a direct job application URL from a general Telegram channel URL. Extract email addresses and phone numbers only when present."
                    },
                    {
                        "role": "user",
                        "content": jobMessage
                    }
                ],
                "format": {
                    "type": "object",
                    "properties": {
                        "company": {
                            "type": [
                                "string",
                                "null"
                            ]
                        },
                        "roles": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "experience": {
                            "type": "object",
                            "properties": {
                                "minYears": {
                                    "type": [
                                        "number",
                                        "null"
                                    ]
                                },
                                "maxYears": {
                                    "type": [
                                        "number",
                                        "null"
                                    ]
                                }
                            },
                            "required": [
                                "minYears",
                                "maxYears"
                            ]
                        },
                        "location": {
                            "type": "object",
                            "properties": {
                                "city": {
                                    "type": [
                                        "string",
                                        "null"
                                    ]
                                },
                                "state": {
                                    "type": [
                                        "string",
                                        "null"
                                    ]
                                },
                                "country": {
                                    "type": [
                                        "string",
                                        "null"
                                    ]
                                }
                            },
                            "required": [
                                "city",
                                "state",
                                "country"
                            ]
                        },
                        "skills": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "application": {
                            "type": "object",
                            "properties": {
                                //           "method": {
                                //             "type": "string",
                                //             "enum": [
                                //               "EMAIL",
                                //               "URL",
                                //               "PHONE",
                                //               "TELEGRAM",
                                //               "OTHER",
                                //               "UNKNOWN"
                                //             ]
                                //           },
                                "email": {
                                    "type": [
                                        "string",
                                        "null"
                                    ]
                                },
                                "phone": {
                                    "type": [
                                        "string",
                                        "null"
                                    ]
                                },
                                "applyUrl": {
                                    "type": [
                                        "string",
                                        "null"
                                    ]
                                },
                                "companyWebsite": {
                                    "type": [
                                        "string",
                                        "null"
                                    ]
                                }
                            },
                            "required": [
                                "email",
                                "phone",
                                "applyUrl",
                                "companyWebsite"
                            ]
                        }
                    },
                    "required": [
                        "company",
                        "roles",
                        "experience",
                        "location",
                        "skills",
                        "application"
                    ]
                },
                "options": {
                    "temperature": 0
                }
            });

            const result = extractedJobSchema.safeParse(JSON.parse(response.message.content));
            if (result.error) {
                throw new Error(`AI unable to parse job JSON as expected structure: ${result.error.message}`);
            }

            return result.data;
        } catch (error) {
            logger.error({ err: error }, "Error converting job message to JSON");
            throw error;
        }
    }

    scoreJobToUser = async (jobData: JobMatchingPayload) => {
        try {
            const [candidate, job] = await Promise.all([
                CandidateProfileModel.findOne({ userId: jobData.userId }).lean(),
                JobModel.findOne({ _id: jobData.jobId }).lean(),
            ]);
            if (!job) {
                throw new Error(`Job with ID ${jobData.jobId} does not exist`);
            }
            if (!candidate) {
                throw new Error(`User with ID ${jobData.userId} does not exist`);
            }

            // Implement the logic for scoring the job to the user here

            const { headline, summary, experience: candidateExperience, preferences, skills: candidateSkills, education } = candidate;
            const { company, roles, experience: jobExperience, location, skills: jobSkills, rawMessage } = job;

            const candidateProfile = { headline, summary, candidateExperience, preferences, candidateSkills, education }
            const jobProfile = { company, roles, jobExperience, location, jobSkills, rawMessage }

            const input = JSON.stringify({ candidate: candidateProfile, job: jobProfile });

            const response = await this.ollama.chat({
                "model": envConfig.models.qwen2_5_7b,
                "stream": false,
                "think": false,
                "messages": [
                    {
                        "role": "system",
                        "content": JOB_MATCHING_PROMPT.instructions
                    },
                    {
                        "role": "user",
                        "content": `user content: ${input}`
                    }
                ],
                "format": {
                    "type": "object",
                    "properties": {
                        "score": {
                            "type": "number"
                        },
                        "reason": {
                            "type": "string"
                        },
                        "matchedSkills": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "missingSkills": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "concerns": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    },
                    "required": ["score", "reason", "matchedSkills", "missingSkills", "concerns"]
                },
                "options": {
                    "temperature": 0
                }
            });

            const result = JSON.parse(response.message.content);

            const parsedResult = jobMatchResultSchema.safeParse(result);

            if (!parsedResult.success) {
                throw new Error(`AI response does not match expected structure: ${response.message.content}`);
            }

            return parsedResult.data;
        } catch (error) {
            logger.error({ err: error }, "Error scoring job to user");
            throw error;
        }
    }
}

export default AIService;