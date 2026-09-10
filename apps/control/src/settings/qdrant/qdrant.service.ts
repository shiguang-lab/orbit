import { Injectable } from "@nestjs/common";
import {
  getSettings,
} from "@orbit/core/db/settings";
import { updatePersistedRuntimeSettings } from "../runtime-settings-persistence.js";
import {
  checkQdrantHealth,
  cleanupSemanticMemoryPoints,
  normalizeQdrantConfig,
  searchSemanticMemory,
} from "@orbit/core/control/qdrant";
import {
  getMemorySettings,
  invalidateMemorySettingsCache,
} from "@orbit/core/memory/settings";
import { getProviderConnections } from "@orbit/core/db/provider-connections";
import { providerAllowsOptionalApiKey } from "@orbit/providers/catalog";
import { getAllEmbeddingModels, deriveEmbeddingProviderForChatProvider } from "@orbit/inference/config/embeddingRegistry";
import { REGISTRY } from "@orbit/providers/provider-registry";

type EmbeddingModelOption = {
  value: string;
  label: string;
  dimensions?: number;
};

function maskApiKey(apiKey: string | null): { hasApiKey: boolean; apiKeyMasked: string | null } {
  if (!apiKey || apiKey.trim().length === 0) return { hasApiKey: false, apiKeyMasked: null };
  const trimmed = apiKey.trim();
  return { hasApiKey: true, apiKeyMasked: `***${trimmed.slice(-4)}` };
}

function buildSettingsResponse(settings: Record<string, unknown>) {
  const config = normalizeQdrantConfig(settings);
  return {
    enabled: config.enabled,
    host: config.host,
    port: config.port,
    collection: config.collection,
    embeddingModel: config.embeddingModel,
    quantization: config.quantization,
    ...maskApiKey(config.apiKey),
  };
}

function modelLabel(value: string, name: string, dimensions?: number): string {
  return `${value} - ${name}${dimensions ? ` (${dimensions}d)` : ""}`;
}

/** Use cases for the control-plane Qdrant integration settings and diagnostics. */
@Injectable()
export class QdrantService {
  async getSettings() {
    return buildSettingsResponse((await getSettings()) as Record<string, unknown>);
  }

  async updateSettings(body: Record<string, unknown>) {
    const updates: Record<string, unknown> = {};
    if (body.enabled !== undefined) {
      updates.qdrantEnabled = body.enabled;
      updates.memoryVectorStore = body.enabled ? "qdrant" : "auto";
    }
    if (body.host !== undefined) updates.qdrantHost = body.host;
    if (body.port !== undefined) updates.qdrantPort = body.port;
    if (body.collection !== undefined) updates.qdrantCollection = body.collection;
    if (body.embeddingModel !== undefined) updates.qdrantEmbeddingModel = body.embeddingModel;
    if (body.quantization !== undefined) updates.qdrantQuantization = body.quantization;
    if (body.apiKey !== undefined) updates.qdrantApiKey = body.apiKey === "" ? null : body.apiKey;

    const next = await updatePersistedRuntimeSettings(updates);
    invalidateMemorySettingsCache();
    return buildSettingsResponse(next);
  }

  health() {
    return checkQdrantHealth();
  }

  async search(query: string, topK: number) {
    const result = await searchSemanticMemory(query, topK);
    return { ok: result.ok, results: result.results ?? [] };
  }

  async cleanup() {
    const memorySettings = await getMemorySettings();
    const result = await cleanupSemanticMemoryPoints({ retentionDays: memorySettings.retentionDays });
    return {
      ok: result.ok,
      deletedCount: result.deletedCount,
      retentionDays: memorySettings.retentionDays,
    };
  }

  async embeddingModels(): Promise<{ models: EmbeddingModelOption[] }> {
    const activeConnections = (await getProviderConnections({ isActive: true })) as Array<
      Record<string, unknown>
    >;
    const configuredProviders = new Set(
      activeConnections
        .filter(
          (connection) =>
            (typeof connection.apiKey === "string" && connection.apiKey.trim().length > 0) ||
            connection.authType === "oauth" ||
            providerAllowsOptionalApiKey(connection.provider),
        )
        .map((connection) => String(connection.provider || ""))
        .filter(Boolean),
    );

    const options: EmbeddingModelOption[] = getAllEmbeddingModels()
      .filter((model) => configuredProviders.has(model.provider))
      .map((model) => ({
        value: model.id,
        label: modelLabel(model.id, model.name, model.dimensions),
        ...(model.dimensions ? { dimensions: model.dimensions } : {}),
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

    // #11390: providers whose embedding models are not in the curated registry
    // can still serve embeddings on a standard OpenAI-compatible /embeddings
    // endpoint — derive the config from the chat registry entry (curated
    // entries always win). Surfaced as a free-text provider option so the
    // operator can pick `<provider>/<model>` manually.
    const curatedProviders = new Set(getAllEmbeddingModels().map((model) => model.provider));
    const derivedOptions: EmbeddingModelOption[] = [];
    for (const provider of configuredProviders) {
      if (curatedProviders.has(provider)) continue;
      const derived = deriveEmbeddingProviderForChatProvider(
        provider,
        REGISTRY[provider] as { id?: string; baseUrl?: string | string[] } | undefined,
      );
      if (!derived) continue;
      const value = `${provider}/embed`;
      if (options.some((option) => option.value === value)) continue;
      derivedOptions.push({
        value,
        label: modelLabel(value, `${provider} (OpenAI-compatible /embeddings)`),
      });
    }
    options.push(...derivedOptions);

    // OpenRouter exposes an account-specific embedding catalog in addition to
    // the static registry. This is best effort and never makes the settings UI fail.
    try {
      const apiKey = activeConnections
        .filter((connection) => connection.provider === "openrouter")
        .find((connection) => typeof connection.apiKey === "string" && connection.apiKey.trim())
        ?.apiKey as string | undefined;
      if (apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        let response: Response;
        try {
          response = await fetch("https://openrouter.ai/api/v1/models?output_modalities=embeddings", {
            method: "GET",
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: "no-store",
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        if (response.ok) {
          const data = (await response.json().catch(() => null)) as { data?: unknown } | null;
          const rows = Array.isArray(data?.data) ? data.data : [];
          for (const row of rows) {
            if (!row || typeof row !== "object") continue;
            const record = row as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id.trim() : "";
            if (!id) continue;
            const value = `openrouter/${id}`;
            if (options.some((option) => option.value === value)) continue;
            options.push({ value, label: modelLabel(value, String(record.name || id)) });
          }
        }
      }
    } catch {
      // Best effort only: keep the management endpoint fast and resilient.
    }

    options.sort((a, b) => a.value.localeCompare(b.value));
    return { models: options };
  }
}
