import { Injectable } from "@nestjs/common";
import fs from "node:fs";
import path from "node:path";
import {
  getIdempotencyStats,
  getCacheMetrics,
  getCacheTrend,
  getCachedSettings,
} from "@orbit/core/cache/services";
import { executeEdgeRuntimeCommand } from "../edge-runtime/client.js";
import { listSemanticCacheEntries } from "@orbit/core/cache/db";

@Injectable()
export class CacheService {
  private mediaCacheDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE || "/home/node";
    return path.join(home, ".shiguangGateway", "media_cache");
  }

  async getMediaStats() {
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
    const { memoryStats: semantic } = await executeEdgeRuntimeCommand<{
      memoryStats: { size?: number };
    }>({ command: "semantic-cache.snapshot" });
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

  async purgeMedia(modality = "all") {
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
    await executeEdgeRuntimeCommand({
      command: "semantic-cache.invalidate",
      operation: { scope: "memory" },
    });
    return { success: true, purgedModality: modality, freedBytes };
  }

  async getOverview(trendHours: number = 24) {
    const safeTrendHours = Math.min(720, Math.max(1, Number.isNaN(trendHours) ? 24 : trendHours));
    const [semanticSnapshot, idempotencyStats, promptCacheMetrics, trend, settings] = await Promise.all([
      executeEdgeRuntimeCommand<{ cacheStats: unknown }>({ command: "semantic-cache.snapshot" }),
      getIdempotencyStats(),
      getCacheMetrics(),
      getCacheTrend(safeTrendHours),
      getCachedSettings().catch(() => ({})),
    ]);

    return {
      semanticCache: semanticSnapshot.cacheStats,
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
      return executeEdgeRuntimeCommand({
        command: "semantic-cache.invalidate",
        operation: { scope: "model", model },
      });
    }

    if (signature) {
      return executeEdgeRuntimeCommand({
        command: "semantic-cache.invalidate",
        operation: { scope: "signature", signature },
      });
    }

    if (staleMs) {
      return executeEdgeRuntimeCommand({
        command: "semantic-cache.invalidate",
        operation: { scope: "stale", maxAgeMs: staleMs },
      });
    }

    return executeEdgeRuntimeCommand({
      command: "semantic-cache.invalidate",
      operation: { scope: "all" },
    });
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

  async deleteEntry(params: { signature?: string; model?: string }) {
    if (params.signature) {
      const result = await executeEdgeRuntimeCommand<{ invalidated: number }>({
        command: "semantic-cache.invalidate",
        operation: { scope: "signature", signature: params.signature },
      });
      return { ok: true, deleted: result.invalidated > 0 };
    }
    if (params.model) {
      const result = await executeEdgeRuntimeCommand<{ invalidated: number }>({
        command: "semantic-cache.invalidate",
        operation: { scope: "model", model: params.model },
      });
      return { ok: true, deleted: result.invalidated };
    }
    return null;
  }

  async getReasoning(params: { provider?: string; model?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(params.limit || 50, 1), 200);
    const offset = Math.max(params.offset || 0, 0);

    return executeEdgeRuntimeCommand({
      command: "reasoning-cache.snapshot",
      limit,
      offset,
      provider: params.provider,
      model: params.model,
    });
  }

  deleteReasoning(params: { toolCallId?: string; provider?: string }) {
    return executeEdgeRuntimeCommand({ command: "reasoning-cache.delete", ...params });
  }

  async getMemoryStats() {
    const { memoryStats } = await executeEdgeRuntimeCommand<{ memoryStats: unknown }>({
      command: "semantic-cache.snapshot",
    });
    return memoryStats;
  }

  clearMemory() {
    return executeEdgeRuntimeCommand({
      command: "semantic-cache.invalidate",
      operation: { scope: "memory" },
    });
  }
}
