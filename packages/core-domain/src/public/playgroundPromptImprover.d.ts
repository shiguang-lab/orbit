import type { z } from "zod";

export const ImprovePromptRequestSchema: z.ZodType<any>;
export function buildImproveChatBody(request: any): {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  max_tokens: number;
  stream: false;
};
export function parseImprovedContent(
  raw: string,
  hadSystem: boolean,
  hadPrompt: boolean,
): { improvedSystem?: string; improvedPrompt?: string };
export type ImprovePromptRequest = any;
export type ImprovePromptResult = any;
