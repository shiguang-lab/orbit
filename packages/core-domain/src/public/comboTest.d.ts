export function buildComboTestRequestBody(modelStr: string, isEmbedding?: boolean, options?: { stream?: boolean; maxTokens?: number; prompt?: string }): Record<string, unknown>;
export function extractComboTestStreamResult(streamBody: string): { text: string; error?: { message: string; statusCode?: number } };
export function extractComboTestResponseText(responseBody: unknown): string;
