import {
  registerMemoryEmbeddingRuntime,
} from "@orbit/core/memory/embedding-port";
import {
  embed,
  listEmbeddingProviders,
  resolveEmbeddingSource,
} from "./memoryEmbedding/index.js";
import { stats as cacheStats } from "./memoryEmbedding/cache.js";
import { createEmbeddingResponse } from "./embeddingRoute/service.js";

async function embedProviderModel(text: string, model: string): Promise<number[]> {
  if (!model.includes("/")) {
    throw new Error(`Invalid embedding model '${model}'. Use provider/model format.`);
  }
  const response = await createEmbeddingResponse({ model, input: text });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail.slice(0, 300) || `Embeddings request failed (${response.status})`);
  }
  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ embedding?: unknown }>;
  } | null;
  const vector = payload?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Embedding response missing vector");
  }
  return vector as number[];
}

let memoryRuntimePortInstalled = false;

export function installMemoryRuntimePort(): void {
  if (memoryRuntimePortInstalled) return;
  registerMemoryEmbeddingRuntime({
    embed,
    listEmbeddingProviders,
    resolveEmbeddingSource,
    cacheStats,
    embedProviderModel,
  });
  memoryRuntimePortInstalled = true;
}

export {
  memoryManager,
  memoryCache,
  getMemoryTokensUsed,
  engineStatus,
  retrievePreview,
  verifyExtractionPipeline,
  runReindexBatch,
  getReindexPending,
  summarizeMemoriesOlderThan,
  markAllMemoriesNeedReindex,
  MemoryType,
} from "@orbit/core/memory/runtime";
export type { Memory } from "@orbit/core/memory/runtime";
export { listEmbeddingProviders };

export {
  retrieveMemories,
  DEFAULT_MEMORY_SETTINGS,
  getMemorySettings,
  toMemoryRetrievalConfig,
  injectMemory,
  shouldInjectMemory,
  systemMessageMustBeFirst,
  extractFacts,
  createMemory,
  deleteMemory,
  listMemories,
} from "@orbit/core/edge/memory-runtime";
