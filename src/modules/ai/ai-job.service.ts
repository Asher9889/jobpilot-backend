import { } from "ollama";
import { JOB_CLASSIFICATION_PROMPT } from "./prompts/job-classification.prompt.ts";
import { envConfig, logger } from "../../config/index.ts";
import { ollamaClient } from "./providers/ollama.ts";
import { extractedJobSchema } from "./ai-extracted-job.schema.ts";
import { TExtractedJob } from "./ai.types.ts";

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
}

export default AIService;