import { Ollama } from "ollama";


const ollama = new Ollama({
  host: process.env.OLLAMA_HOST ?? "http://localhost:11434",
});