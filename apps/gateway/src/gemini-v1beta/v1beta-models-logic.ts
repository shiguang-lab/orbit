interface ModelRecord {
  id: string;
  name?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportsThinking?: boolean;
}

interface ModelCapabilities {
  maxInputTokens?: number | null;
  contextWindow?: number | null;
  maxOutputTokens?: number | null;
  supportsThinking?: boolean | null;
}

export interface V1BetaModelsDependencies {
  providerModels: Record<string, readonly ModelRecord[]>;
  providerIdToAlias: Record<string, string>;
  getProviderConnections: () => readonly Record<string, unknown>[] | Promise<readonly Record<string, unknown>[]>;
  getAllCustomModels: () => Promise<Record<string, unknown>>;
  getAllSyncedAvailableModels: () => Promise<Record<string, unknown>>;
  getSyncedAvailableModels: (provider: string) => Promise<ModelRecord[]>;
  getResolvedModelCapabilities: (input: { provider: string; model: string }) => ModelCapabilities;
  getSyncedCapabilities: () => unknown;
  mergeCustomModelMetadata: (base: Record<string, unknown>, custom: Record<string, unknown>) => Record<string, unknown>;
  sanitizeErrorMessage: (error: unknown) => string;
}

/**
 * Build the set of provider keys (raw id + alias) that have at least one active/validated
 * connection. Mirrors the active-provider filter used by the OpenAI-format /v1/models
 * catalog so /v1beta/models only lists models the user can actually call (#2483).
 */
async function getActiveProviderKeys(dependencies: V1BetaModelsDependencies): Promise<Set<string>> {
  const keys = new Set<string>();
  try {
    const connections = await dependencies.getProviderConnections();
    for (const conn of connections) {
      if (conn.isActive === false) continue;
      const provider = typeof conn.provider === "string" ? conn.provider : null;
      if (!provider) continue;
      keys.add(provider);
      const alias = dependencies.providerIdToAlias[provider];
      if (alias) keys.add(alias);
    }
  } catch (e) {
    // DB unavailable — return empty set (safe default: list nothing provider-gated)
    console.error("[v1beta/models] Could not fetch provider connections:", e);
  }
  return keys;
}

/**
 * Handle CORS preflight
 */
export function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/**
 * GET /v1beta/models - Gemini compatible models list
 * Returns models in Gemini API format with real token limits when available.
 */
export async function GET(
  dependencies: V1BetaModelsDependencies,
) {
  try {
    dependencies.getSyncedCapabilities();
    const models: Record<string, unknown>[] = [];
    const existingNames = new Set<string>();

    // Only list models whose provider has an active/validated connection (#2483).
    const activeKeys = await getActiveProviderKeys(dependencies);

    // Built-in models (hardcoded defaults)
    for (const [provider, providerModels] of Object.entries(dependencies.providerModels)) {
      if (!activeKeys.has(provider)) continue;
      for (const model of providerModels) {
        const name = `models/${provider}/${model.id}`;
        if (existingNames.has(name)) continue;
        const resolved = dependencies.getResolvedModelCapabilities({ provider, model: model.id });
        models.push({
          name,
          displayName: model.name || model.id,
          description: `${provider} model: ${model.name || model.id}`,
          supportedGenerationMethods: ["generateContent"],
          inputTokenLimit: resolved.maxInputTokens || resolved.contextWindow || 128000,
          outputTokenLimit: resolved.maxOutputTokens || 8192,
          ...(resolved.supportsThinking === true ? { thinking: true } : {}),
        });
        existingNames.add(name);
      }
    }

    // Gemini: always replace hardcoded entries with synced models (no fallback)
    // Always remove hardcoded gemini entries — even if sync returns empty
    for (let i = models.length - 1; i >= 0; i--) {
      if (
        typeof (models[i] as any).name === "string" &&
        (models[i] as any).name.startsWith("models/gemini/")
      ) {
        models.splice(i, 1);
      }
    }
    try {
      const syncedGeminiModels = activeKeys.has("gemini")
        ? await dependencies.getSyncedAvailableModels("gemini")
        : [];
      for (const m of syncedGeminiModels) {
        models.push({
          name: `models/gemini/${m.id}`,
          displayName: m.name || m.id,
          ...(typeof m.description === "string" ? { description: m.description } : {}),
          supportedGenerationMethods: ["generateContent"],
          inputTokenLimit: typeof m.inputTokenLimit === "number" ? m.inputTokenLimit : 128000,
          outputTokenLimit: typeof m.outputTokenLimit === "number" ? m.outputTokenLimit : 8192,
          ...(m.supportsThinking === true ? { thinking: true } : {}),
        });
      }
    } catch (err) {
      console.error("[v1beta/models] Error fetching synced Gemini models:", err);
    }

    // Synced/imported models for non-Gemini providers
    try {
      const syncedModelsMap = await dependencies.getAllSyncedAvailableModels();
      for (const [providerId, syncedModels] of Object.entries(syncedModelsMap)) {
        if (providerId === "gemini") continue;
        if (!activeKeys.has(providerId)) continue;
        if (!Array.isArray(syncedModels)) continue;
        for (const m of syncedModels) {
          if (!m || typeof m.id !== "string") continue;
          const name = `models/${providerId}/${m.id}`;
          if (existingNames.has(name)) continue;
          const resolved = dependencies.getResolvedModelCapabilities({
            provider: providerId,
            model: m.id,
          });
          models.push({
            name,
            displayName: m.name || m.id,
            ...(typeof m.description === "string" ? { description: m.description } : {}),
            supportedGenerationMethods: ["generateContent"],
            inputTokenLimit:
              typeof m.inputTokenLimit === "number"
                ? m.inputTokenLimit
                : resolved.maxInputTokens || resolved.contextWindow || 128000,
            outputTokenLimit:
              typeof m.outputTokenLimit === "number"
                ? m.outputTokenLimit
                : resolved.maxOutputTokens || 8192,
            ...(m.supportsThinking === true || resolved.supportsThinking === true
              ? { thinking: true }
              : {}),
          });
          existingNames.add(name);
        }
      }
    } catch {
      // Synced models are optional — skip on error
    }

    // Custom models (use stored metadata from provider APIs)
    try {
      const customModelsMap = await dependencies.getAllCustomModels();
      for (const [providerId, rawModels] of Object.entries(customModelsMap)) {
        if (!Array.isArray(rawModels)) continue;
        // Skip Gemini — handled by syncedAvailableModels above
        if (providerId === "gemini") continue;
        if (!activeKeys.has(providerId)) continue;
        for (const model of rawModels) {
          if (!model || typeof model !== "object" || typeof (model as any).id !== "string")
            continue;
          const m = model as Record<string, unknown>;
          if (m.isHidden === true) continue;
          const resolved = dependencies.getResolvedModelCapabilities({
            provider: providerId,
            model: String(m.id),
          });
          const name = `models/${providerId}/${m.id}`;
          const customEntry = {
            name,
            displayName: m.name || m.id,
            ...(typeof m.description === "string" ? { description: m.description } : {}),
            supportedGenerationMethods: ["generateContent"],
            inputTokenLimit:
              typeof m.inputTokenLimit === "number"
                ? m.inputTokenLimit
                : resolved.maxInputTokens || resolved.contextWindow || 128000,
            outputTokenLimit:
              typeof m.outputTokenLimit === "number"
                ? m.outputTokenLimit
                : resolved.maxOutputTokens || 8192,
            ...(typeof m.supportsThinking === "boolean"
              ? { thinking: m.supportsThinking }
              : resolved.supportsThinking === true
                ? { thinking: true }
                : {}),
          };
          const existingIndex = models.findIndex((entry) => entry.name === name);
          if (existingIndex !== -1) {
            models[existingIndex] = dependencies.mergeCustomModelMetadata(
              models[existingIndex],
              customEntry,
            );
            continue;
          }
          models.push(customEntry);
          existingNames.add(name);
        }
      }
    } catch {
      // Custom models are optional — skip on error
    }

    return Response.json({ models });
  } catch (error: any) {
    console.log("Error fetching models:", error);
    return Response.json(
      { error: { message: dependencies.sanitizeErrorMessage(error) } },
      { status: 500 },
    );
  }
}
