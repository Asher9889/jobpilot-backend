export interface OpenCodeTaskInput {
  title: string;
  prompt: string;
}

export interface OpenCodeTaskResult {
  sessionId: string;
  response: unknown;
}