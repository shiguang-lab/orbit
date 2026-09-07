export type GeminiEmbeddingModality = "text" | "image" | "audio" | "video" | "document";

export function isGeminiEmbedding2Family(modelId: string | null | undefined): boolean;
export function isGeminiNativePart(value: unknown): boolean;
export function isGeminiNativeContent(value: unknown): boolean;
export function isGeminiNativeEmbedRequest(value: unknown): boolean;
export function isGeminiNativeEmbeddingInput(input: unknown): boolean;
export function collectGeminiNativeModalities(input: unknown): GeminiEmbeddingModality[];
