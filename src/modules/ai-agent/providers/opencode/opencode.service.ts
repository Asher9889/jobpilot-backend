import opencode from "./opencode.client.ts";
import { OpenCodeTaskInput, OpenCodeTaskResult } from "./opencode.types.ts";

export class OpenCodeService {
  async createSession(title: string): Promise<string> {
    const result = await opencode.client.session.create({
      body: { title },
    });

    if (!result.data?.id) {
      throw new Error("Failed to create OpenCode session");
    }

    return result.data.id;
  }

  async sendPrompt( sessionId: string, prompt: string ): Promise<unknown> {
    const result = await opencode.client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    });

    return result.data;
  }

  async runTask(input: OpenCodeTaskInput): Promise<OpenCodeTaskResult> {
    const sessionId = await this.createSession(input.title);

    const response = await this.sendPrompt(
      sessionId,
      input.prompt,
    );

    return { sessionId, response };
  }
}

export const openCodeService = new OpenCodeService();