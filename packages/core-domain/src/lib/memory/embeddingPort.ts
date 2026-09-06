import type { MemorySettingsExtended } from "../../shared/schemas/memory.ts";

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
  resolveEmbeddingSource(settings: MemorySettingsExtended): EmbeddingResolution;
  embed(text: string, settings: MemorySettingsExtended): Promise<EmbeddingResult | EmbeddingError>;
  embedProviderModel(text: string, model: string): Promise<number[]>;
  listEmbeddingProviders(): Promise<EmbeddingProviderListing[]>;
  cacheStats(): { hits: number; misses: number; size: number };
}

const unavailableRuntime: MemoryEmbeddingRuntime = {
  resolveEmbeddingSource: () => ({
    source: null,
    model: null,
    dimensions: null,
    signature: "null:null:null",
    reason: "embedding runtime unavailable",
  }),
  async embed() {
    return {
      source: "remote",
      model: null,
      reason: "unknown",
      message: "embedding runtime unavailable",
    };
  },
  async listEmbeddingProviders() {
    return [];
  },
  async embedProviderModel() {
    throw new Error("embedding runtime unavailable");
  },
  cacheStats() {
    return { hits: 0, misses: 0, size: 0 };
  },
};

let runtime: MemoryEmbeddingRuntime = unavailableRuntime;

export function registerMemoryEmbeddingRuntime(next: MemoryEmbeddingRuntime): void {
  runtime = next;
}

export function resolveEmbeddingSource(settings: MemorySettingsExtended): EmbeddingResolution {
  return runtime.resolveEmbeddingSource(settings);
}

export function embed(
  text: string,
  settings: MemorySettingsExtended,
): Promise<EmbeddingResult | EmbeddingError> {
  return runtime.embed(text, settings);
}

export function listEmbeddingProviders(): Promise<EmbeddingProviderListing[]> {
  return runtime.listEmbeddingProviders();
}

export function embedProviderModel(text: string, model: string): Promise<number[]> {
  return runtime.embedProviderModel(text, model);
}

export function getEmbeddingCacheStats(): { hits: number; misses: number; size: number } {
  return runtime.cacheStats();
}
