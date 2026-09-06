import { Injectable } from "@nestjs/common";
import fs from "node:fs";
import path from "node:path";
import {
  getCacheStats,
  clearCache,
  invalidateByModel,
  invalidateBySignature,
  invalidateStale,
  getIdempotencyStats,
  getCacheMetrics,
  getCacheTrend,
  getCachedSettings,
  clearReasoningCacheAll,
  deleteReasoningCacheEntry,
  getReasoningCacheServiceEntries,
  getReasoningCacheServiceStats,
  clearMemoryCache,
  getMemoryCacheStats,
} from "@shiguang-gateway/core-domain/cache/services";
import {
  listSemanticCacheEntries,
  deleteSemanticCacheBySignature,
  deleteSemanticCacheByModel,
} from "@shiguang-gateway/core-domain/cache/db";

@Injectable()
export class CacheService {
  private mediaCacheDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE || "/home/node";
    return path.join(home, ".shiguangGateway", "media_cache");
  }

  getMediaStats() {
    const dir = this.mediaCacheDir();
    let totalBytes = 0;
    let totalFiles = 0;
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        try {
          totalBytes += fs.statSync(path.join(dir, entry.name)).size;
          totalFiles += 1;
        } catch {
          // A file removed during enumeration is not part of this snapshot.
        }
      }
    }
    const semantic = getMemoryCacheStats();
    return {
      totalBytes,
      totalFiles,
      semanticEntries: semantic.size ?? 0,
      byModality: {
        image: { files: totalFiles, bytes: totalBytes },
        video: { files: 0, bytes: 0 },
        music: { files: 0, bytes: 0 },
        speech: { files: 0, bytes: 0 },
        transcription: { files: 0, bytes: 0 },
      },
    };
  }

  purgeMedia(modality = "all") {
    const dir = this.mediaCacheDir();
    let freedBytes = 0;
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const file = path.join(dir, entry.name);
        try {
          freedBytes += fs.statSync(file).size;
          fs.unlinkSync(file);
        } catch {
          // Continue clearing the remaining cache entries.
        }
      }
    }
    clearMemoryCache();
    return { success: true, purgedModality: modality, freedBytes };
  }

  async getOverview(trendHours: number = 24) {
    const safeTrendHours = Math.min(720, Math.max(1, Number.isNaN(trendHours) ? 24 : trendHours));
    const cacheStats = getCacheStats();
    const [idempotencyStats, promptCacheMetrics, trend, settings] = await Promise.all([
      getIdempotencyStats(),
      getCacheMetrics(),
      getCacheTrend(safeTrendHours),
      getCachedSettings().catch(() => ({})),
    ]);

    return {
      semanticCache: cacheStats,
      promptCache: promptCacheMetrics,
      trend,
      idempotency: idempotencyStats,
      config: {
        semanticCacheEnabled: (settings as any).semanticCacheEnabled !== false,
      },
    };
  }

  deleteCache(params: { model?: string; signature?: string; staleMs?: number }) {
    const { model, signature, staleMs } = params;

    if (model) {
      const removed = invalidateByModel(model);
      return { ok: true, invalidated: removed, scope: "model", model };
    }

    if (signature) {
      const removed = invalidateBySignature(signature);
      return { ok: true, invalidated: removed ? 1 : 0, scope: "signature" };
    }

    if (staleMs) {
      const removed = invalidateStale(staleMs);
      return { ok: true, invalidated: removed, scope: "stale", maxAgeMs: staleMs };
    }

    const cleared = clearCache();
    return { ok: true, cleared, scope: "all" };
  }

  listEntries(params: {
    page?: number;
    limit?: number;
    search?: string;
    model?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const { search = "", model = "", sortBy = "created_at", sortOrder = "desc" } = params;

    const { entries, total } = listSemanticCacheEntries({ page, limit, search, model, sortBy, sortOrder });
    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  deleteEntry(params: { signature?: string; model?: string }) {
    if (params.signature) {
      const { deleted } = deleteSemanticCacheBySignature(params.signature);
      return { ok: true, deleted };
    }
    if (params.model) {
      const { deleted } = deleteSemanticCacheByModel(params.model);
      return { ok: true, deleted };
    }
    return null;
  }

  getReasoning(params: { provider?: string; model?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(params.limit || 50, 1), 200);
    const offset = Math.max(params.offset || 0, 0);

    const stats = getReasoningCacheServiceStats();
    const entries = getReasoningCacheServiceEntries({
      limit,
      offset,
      provider: params.provider,
      model: params.model,
    });

    return { stats, entries };
  }

  deleteReasoning(params: { toolCallId?: string; provider?: string }) {
    if (params.toolCallId) {
      const cleared = deleteReasoningCacheEntry(params.toolCallId);
      return { ok: true, cleared, scope: "toolCallId", toolCallId: params.toolCallId };
    }

    const cleared = clearReasoningCacheAll(params.provider);
    return {
      ok: true,
      cleared,
      scope: params.provider ? "provider" : "all",
      ...(params.provider ? { provider: params.provider } : {}),
    };
  }

  getMemoryStats() {
    return getMemoryCacheStats();
  }

  clearMemory() {
    clearMemoryCache();
    return { success: true, message: "Cache cleared" };
  }
}
