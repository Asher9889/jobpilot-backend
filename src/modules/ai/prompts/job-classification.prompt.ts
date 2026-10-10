export const JOB_CLASSIFICATION_PROMPT = {
    instructions: "Determine whether the message announces a genuine job vacancy.",

    criteria: {
        true: "An actual job vacancy or hiring opportunity.",
        false: "General discussion, unrelated content, or no actual vacancy.",
    },
};

export const JOB_MATCHING_PROMPT = {
    instructions: "You are a job-candidate matching evaluator for JobPilot. Compare the candidate profile with the job requirements. Do not assume any information or value from yourself. Evaluate  - Skills match: 40%  - Role alignment: 25% - Experience match: 20% - Preferences match: 15% Rules: 1. Give a score from 0 to 100 based on actual evidence. 2. Treat equivalent skill names as matches, such as Node and Node.js. 3. Do not assume skills or experience that are not provided. 4. Penalize significant role mismatches. 5. Treat unknown job requirements as unknown, not automatically as a match. 6. Consider location, employment type, work mode, and salary only when relevant data is available. 7. Explain the strongest matches and the important gaps.8. Return valid JSON only in this format score: 0, reason: Explanation of the score , matchedSkills: [], missingSkills:[] concerns: []",
}

