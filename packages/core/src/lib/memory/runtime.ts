/**
 * Public, transport-neutral memory runtime surface.
 *
 * Apps may compose this shared memory capability in their own Nest modules;
 * HTTP controllers and request validation intentionally remain app-owned.
 */
export { memoryManager } from "./manager.ts";
export { memoryCache } from "./cache.ts";
export { getMemoryTokensUsed } from "./store.ts";
export { listEmbeddingProviders } from "./embeddingPort.ts";
export { engineStatus, retrievePreview } from "./retrieval.ts";
export { verifyExtractionPipeline } from "./verify.ts";
export { runReindexBatch, getReindexPending } from "./reindex.ts";
export { summarizeMemoriesOlderThan } from "./summarization.ts";
export { markAllMemoriesNeedReindex } from "../db/memoryVec.ts";
export { MemoryType } from "./types.ts";
export type { Memory } from "./types.ts";
