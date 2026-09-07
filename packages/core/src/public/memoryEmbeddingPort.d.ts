import type { MemorySettings } from "./memorySettings.d.ts";

export type EmbeddingSource = "remote" | "static" | "transformers" | "auto";

export interface EmbeddingProviderListing {
  provider: string;
  hasKey: boolean;
  models: Array<{ id: string; name: string; dimensions: number | null }>;
}
export interface EmbeddingResolution {
  source: "remote" | "static" | "transformers" | null;
  model: string | null;
  dimensions: number | null;
  signature: string;
  identity?: string;
  reason: string;
}
export interface EmbeddingResult {
  vector: Float32Array;
  source: "remote" | "static" | "transformers";
  model: string;
  dimensions: number;
  latencyMs: number;
  cached: boolean;
}
export interface EmbeddingError {
  source: "remote" | "static" | "transformers";
  model: string | null;
  reason: "no_key" | "model_load_failed" | "request_failed" | "rate_limited" | "timeout" | "unknown";
  message: string;
}
export interface MemoryEmbeddingRuntime {
  resolveEmbeddingSource(settings: MemorySettings): EmbeddingResolution;
  embed(text: string, settings: MemorySettings): Promise<EmbeddingResult | EmbeddingError>;
  embedProviderModel(text: string, model: string): Promise<number[]>;
  listEmbeddingProviders(): Promise<EmbeddingProviderListing[]>;
  cacheStats(): { hits: number; misses: number; size: number };
}
export declare function registerMemoryEmbeddingRuntime(runtime: MemoryEmbeddingRuntime): void;
export declare function resolveEmbeddingSource(settings: MemorySettings): EmbeddingResolution;
export declare function embed(text: string, settings: MemorySettings): Promise<EmbeddingResult | EmbeddingError>;
export declare function listEmbeddingProviders(): Promise<EmbeddingProviderListing[]>;
export declare function embedProviderModel(text: string, model: string): Promise<number[]>;
export declare function getEmbeddingCacheStats(): { hits: number; misses: number; size: number };
