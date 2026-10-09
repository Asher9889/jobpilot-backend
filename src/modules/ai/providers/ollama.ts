import { Ollama } from "ollama";


const ollamaClient = new Ollama({
  host: process.env.OLLAMA_HOST!,  
  headers: {
    "Authorization": `Bearer ${process.env.OLLAMA_API_KEY!}`,
  },
});

export { ollamaClient };