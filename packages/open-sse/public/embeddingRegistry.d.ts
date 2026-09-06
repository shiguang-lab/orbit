export interface EmbeddingModelDescriptor {
  id: string;
  name: string;
  provider: string;
  dimensions: number | undefined;
}
export interface EmbeddingModel {
  id: string;
  name: string;
  dimensions?: number;
  modalities?: Array<"text" | "image" | "audio" | "video" | "document">;
  defaultParams?: Record<string, unknown>;
}
export interface EmbeddingProvider {
  id: string;
  baseUrl: string;
  authType: string;
  authHeader: string;
  models: EmbeddingModel[];
  structuredInputProtocol?: "jina-v1" | "gemini-embed-content";
}
export function getAllEmbeddingModels(): EmbeddingModelDescriptor[];
export function getEmbeddingProvider(providerId: string): EmbeddingProvider | null;
