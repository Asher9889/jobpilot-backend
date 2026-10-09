import AIService from "./ai-job.service.ts";
import { ollamaClient } from "./providers/ollama.ts"; 

const aiService = new AIService(ollamaClient);

export { aiService };

