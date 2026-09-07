import { Injectable } from "@nestjs/common";
import type { Memory, MemoryType } from "@orbit/core/memory/runtime";
import { getSettings } from "@orbit/core/db/settings";
import { executeEdgeRuntimeCommand } from "../edge-runtime/client.js";
import { updatePersistedRuntimeSettings } from "../settings/runtime-settings-persistence.js";
import {
  invalidateMemorySettingsCache,
  normalizeMemorySettings,
  toMemorySettingsUpdates,
} from "@orbit/core/memory/settings";
import type { CreateMemoryInput, UpdateMemoryInput } from "./memory.schemas.js";

type RuntimeMemory = Omit<Memory, "createdAt" | "updatedAt" | "expiresAt" | "lastAccessedAt"> & {
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  lastAccessedAt: string | null;
};

/** Control-plane use cases for memory administration. */
@Injectable()
export class MemoryService {
  async getSettings() {
    return normalizeMemorySettings(await getSettings());
  }

  async updateSettings(input: Record<string, unknown>) {
    const settings = await updatePersistedRuntimeSettings(toMemorySettingsUpdates(input));
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
    return executeEdgeRuntimeCommand<{
      result: { data: RuntimeMemory[]; total: number; byType: Record<string, number> };
      stats: Record<string, unknown>;
    }>({ command: "memory.list", filters });
  }

  async create(input: CreateMemoryInput): Promise<RuntimeMemory> {
    const payload = {
      ...input,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    };
    const { memory } = await executeEdgeRuntimeCommand<{ memory: RuntimeMemory }>({
      command: "memory.create",
      input: payload,
    });
    return memory;
  }

  async get(id: string): Promise<RuntimeMemory | null> {
    const { memory } = await executeEdgeRuntimeCommand<{ memory: RuntimeMemory | null }>({
      command: "memory.get",
      id,
    });
    return memory;
  }

  async update(id: string, input: UpdateMemoryInput): Promise<boolean> {
    const { updated } = await executeEdgeRuntimeCommand<{ updated: boolean }>({
      command: "memory.update",
      id,
      input,
    });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { deleted } = await executeEdgeRuntimeCommand<{ deleted: boolean }>({
      command: "memory.delete",
      id,
    });
    return deleted;
  }

  async embeddingProviders() {
    const { providers } = await executeEdgeRuntimeCommand<{ providers: unknown[] }>({
      command: "memory.embedding-providers",
    });
    return providers;
  }

  async engineStatus() {
    return executeEdgeRuntimeCommand({ command: "memory.engine-status" });
  }

  async health() {
    return executeEdgeRuntimeCommand({ command: "memory.health" });
  }

  async retrievePreview(
    apiKeyId: string | null,
    query: string,
    options: { strategy: "exact" | "semantic" | "hybrid"; maxTokens: number; limit: number },
  ) {
    return executeEdgeRuntimeCommand<{
      items: Array<{
        memory: RuntimeMemory;
        score: number;
        tokens: number;
        tier: string;
        vecScore: number | null;
        ftsScore: number | null;
      }>;
      resolution: unknown;
      totalTokens: number;
      budgetMaxTokens: number;
    }>({ command: "memory.retrieve-preview", apiKeyId, query, ...options });
  }

  async summarize(apiKeyId: string | undefined, olderThanDays: number, dryRun: boolean) {
    return executeEdgeRuntimeCommand({
      command: "memory.summarize",
      apiKeyId,
      olderThanDays,
      dryRun,
    });
  }

  reindex(force: boolean) {
    return executeEdgeRuntimeCommand<{ started: true; pending: number }>({
      command: "memory.reindex",
      force,
    });
  }
}
