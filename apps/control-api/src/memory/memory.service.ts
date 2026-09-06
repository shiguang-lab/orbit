import { Injectable, Logger } from "@nestjs/common";
import {
  engineStatus,
  getMemoryTokensUsed,
  getReindexPending,
  listEmbeddingProviders,
  markAllMemoriesNeedReindex,
  memoryCache,
  memoryManager,
  retrievePreview,
  runReindexBatch,
  summarizeMemoriesOlderThan,
  verifyExtractionPipeline,
  type Memory,
  type MemoryType,
} from "@shiguang-gateway/core-domain/memory/runtime";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/control/settings";
import {
  invalidateMemorySettingsCache,
  normalizeMemorySettings,
  toMemorySettingsUpdates,
} from "@shiguang-gateway/core-domain/memory/settings";
import type { CreateMemoryInput, UpdateMemoryInput } from "./memory.schemas.js";

/** Control-plane use cases for memory administration. */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  async getSettings() {
    return normalizeMemorySettings(await getSettings());
  }

  async updateSettings(input: Record<string, unknown>) {
    const settings = await updateSettings(toMemorySettingsUpdates(input));
    invalidateMemorySettingsCache();
    return normalizeMemorySettings(
      settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {},
    );
  }

  async list(filters: {
    apiKeyId?: string;
    type?: MemoryType;
    sessionId?: string;
    query?: string;
    limit: number;
    offset?: number;
    page: number;
  }) {
    const result = await memoryManager.list(filters);
    const tokensUsed = getMemoryTokensUsed(filters.apiKeyId);
    const cacheStats = memoryCache.stats();
    const totalCacheRequests = cacheStats.hits + cacheStats.misses;
    const hitRate = totalCacheRequests > 0 ? cacheStats.hits / totalCacheRequests : 0;
    return {
      result,
      stats: {
        total: result.total,
        byType: result.byType ?? {},
        tokensUsed,
        hitRate,
        cacheStats: { hits: cacheStats.hits, misses: cacheStats.misses },
      },
    };
  }

  async create(input: CreateMemoryInput): Promise<Memory> {
    return memoryManager.create(input);
  }

  async get(id: string): Promise<Memory | null> {
    return memoryManager.get(id);
  }

  async update(id: string, input: UpdateMemoryInput): Promise<boolean> {
    return memoryManager.update(id, input);
  }

  async delete(id: string): Promise<boolean> {
    return memoryManager.delete(id);
  }

  async embeddingProviders() {
    return listEmbeddingProviders();
  }

  async engineStatus() {
    return engineStatus();
  }

  async health() {
    return verifyExtractionPipeline("health-check");
  }

  async retrievePreview(
    apiKeyId: string | null,
    query: string,
    options: { strategy: "exact" | "semantic" | "hybrid"; maxTokens: number; limit: number },
  ) {
    return retrievePreview(apiKeyId, query, options);
  }

  async summarize(apiKeyId: string | undefined, olderThanDays: number, dryRun: boolean) {
    return summarizeMemoriesOlderThan(apiKeyId, olderThanDays, dryRun);
  }

  reindex(force: boolean) {
    if (force) markAllMemoriesNeedReindex();
    const pending = getReindexPending();
    setImmediate(() => {
      runReindexBatch(100).catch((error: unknown) => {
        this.logger.error(`memory.reindex.background.fail: ${String(error)}`);
      });
    });
    return { started: true, pending };
  }
}
