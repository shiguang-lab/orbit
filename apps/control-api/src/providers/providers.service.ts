import { Injectable } from "@nestjs/common";
import { getProviderMetrics } from "@orbit/core/db/call-log-stats";
import { toNumber } from "@orbit/contracts/numeric";
import {
  getModelCallStats,
  getProviderCallStats,
} from "@orbit/core/db/provider-stats";
import { AI_PROVIDERS } from "@orbit/providers/catalog";
import { getTelemetrySummary } from "@orbit/core/metrics/request-telemetry";
import { getProviderConnections } from "@orbit/core/db/provider-connections";
import {
  getSyncedAvailableModels,
  getAllSyncedAvailableModels,
} from "@orbit/core/db/models";
import {
  GET as getProviderModelsHandler,
  POST as addProviderModelHandler,
  PUT as updateProviderModelHandler,
  PATCH as patchProviderModelHandler,
  DELETE as deleteProviderModelHandler,
} from "./handlers/provider-models.js";
import {
  GET as getProviderNodesHandler,
  POST as createProviderNodeHandler,
} from "./handlers/provider-nodes.js";
import {
  DELETE as deleteProviderNodeHandler,
  PUT as updateProviderNodeHandler,
} from "./handlers/provider-node-by-id.js";
import { POST as validateProviderNodeHandler } from "./handlers/provider-nodes-validate.js";
import { POST as validateProviderHandler } from "./handlers/provider-validate.js";
import {
  getOpenRouterProviderStats,
  refreshOpenRouterProviderStats,
} from "@orbit/core/catalog/openrouter-provider-stats";
import {
  buildProviderHealthMatrix,
} from "@orbit/core/control/provider-health-matrix";
import { resolveProviderAlias } from "@orbit/inference/services/model";
import {
  getAllExpirations,
  getExpirationSummary,
} from "./provider-expiration.js";
import { resolveResilienceSettings } from "@orbit/core/resilience/settings";
import { getCachedSettings } from "@orbit/core/cache/services";
import { handleProviderRefresh } from "./handlers/provider-refresh.handler.js";
import { GET as getChatgptWebCodexDoctor } from "./handlers/provider-chatgpt-web-codex-doctor.js";
import { POST as refreshProviderToken } from "./handlers/provider-refresh-token.js";
import { POST as refreshCursorToken } from "./handlers/provider-refresh-cursor.js";
import { executeEdgeRuntimeCommand } from "../edge-runtime/client.js";

@Injectable()
export class ProvidersService {
  getMetrics() {
    const rows = getProviderMetrics();

    const metrics: Record<
      string,
      {
        totalRequests: number;
        totalSuccesses: number;
        successRate: number;
        avgLatencyMs: number;
        lastRequestAt: string | null;
        lastErrorAt: string | null;
        lastStatus: number | null;
        lastErrorStatus: number | null;
      }
    > = {};
    let lastProvider = "";
    let lastProviderTs = 0;
    let errorProvider = "";
    let errorProviderTs = 0;

    for (const row of rows) {
      const provider =
        typeof row.provider === "string" && row.provider.trim().length > 0
          ? row.provider
          : "unknown";
      const totalRequests = toNumber(row.totalRequests);
      const totalSuccesses = toNumber(row.totalSuccesses);
      const avgLatencyMs = toNumber(row.avgLatencyMs);
      const lastRequestAt = typeof row.lastRequestAt === "string" ? row.lastRequestAt : null;
      const lastErrorAt = typeof row.lastErrorAt === "string" ? row.lastErrorAt : null;
      const lastStatus = row.lastStatus == null ? null : toNumber(row.lastStatus);
      const lastErrorStatus = row.lastErrorStatus == null ? null : toNumber(row.lastErrorStatus);
      metrics[provider] = {
        totalRequests,
        totalSuccesses,
        successRate: totalRequests > 0 ? Math.round((totalSuccesses / totalRequests) * 100) : 0,
        avgLatencyMs,
        lastRequestAt,
        lastErrorAt,
        lastStatus,
        lastErrorStatus,
      };

      const requestTs = lastRequestAt ? Date.parse(lastRequestAt) : 0;
      if (Number.isFinite(requestTs) && requestTs > lastProviderTs) {
        lastProvider = provider;
        lastProviderTs = requestTs;
      }

      const isCurrentlyInError =
        lastStatus !== null && (lastStatus < 200 || lastStatus >= 400);
      const errorTs = isCurrentlyInError && lastErrorAt ? Date.parse(lastErrorAt) : 0;
      if (Number.isFinite(errorTs) && errorTs > errorProviderTs) {
        errorProvider = provider;
        errorProviderTs = errorTs;
      }
    }

    return {
      metrics,
      topology: {
        providers: Object.keys(metrics),
        lastProvider,
        errorProvider,
      },
    };
  }

  async getStats() {
    const [{ metrics: comboMetrics }, { providers: toolLatency }] = await Promise.all([
      executeEdgeRuntimeCommand<{ metrics: Record<string, unknown> }>({
        command: "combo-metrics.snapshot",
      }),
      executeEdgeRuntimeCommand<{ providers: Record<string, unknown> }>({
        command: "tool-latency.snapshot",
      }),
    ]);
    const resolveName = (provider: string, nodeName: string | null) => {
      if (nodeName?.trim()) return nodeName.trim();
      return (AI_PROVIDERS as any)[provider]?.name ?? provider;
    };
    const providers = getProviderCallStats().map((provider) => ({
      ...provider,
      provider: resolveName(provider.provider, provider.nodeName),
    }));
    const models = getModelCallStats().map((model) => ({
      ...model,
      provider: resolveName(model.provider, model.nodeName),
    }));
    return {
      providers,
      models,
      comboMetrics,
      telemetry: getTelemetrySummary(300_000),
      toolLatency,
    };
  }

  async getTokenHealth() {
    const connections = await getProviderConnections({ authType: "oauth" });
    const oauthConnections = connections.filter(
      (connection) => connection.isActive && connection.refreshToken
    );
    const healthy = oauthConnections.filter(
      (connection) => connection.testStatus === "active" || !connection.lastError
    ).length;
    const errored = oauthConnections.filter(
      (connection) =>
        connection.testStatus === "error" || connection.lastErrorType === "token_refresh_failed"
    ).length;
    const lastCheckAt = oauthConnections.reduce<string | null>((latest, connection) => {
      if (!connection.lastHealthCheckAt) return latest;
      return latest && latest > connection.lastHealthCheckAt ? latest : connection.lastHealthCheckAt;
    }, null);

    return {
      total: oauthConnections.length,
      healthy,
      errored,
      warning: oauthConnections.length - healthy - errored,
      lastCheckAt,
      status: errored > 0 ? "error" : healthy < oauthConnections.length ? "warning" : "healthy",
    };
  }

  async getSyncedModels(provider?: string | null) {
    if (provider) return { models: await getSyncedAvailableModels(provider) };
    return getAllSyncedAvailableModels();
  }

  async getOpenRouterStats(forceRefresh: true): ReturnType<typeof refreshOpenRouterProviderStats>;
  async getOpenRouterStats(forceRefresh: false): ReturnType<typeof getOpenRouterProviderStats>;
  async getOpenRouterStats(forceRefresh: boolean) {
    if (forceRefresh) return refreshOpenRouterProviderStats();
    return getOpenRouterProviderStats();
  }

  getProviderExpirations() {
    return { summary: getExpirationSummary(), list: getAllExpirations() };
  }

  async getQuotaWindows() {
    const { windows } = await executeEdgeRuntimeCommand<{ windows: unknown }>({
      command: "quota-windows.snapshot",
    });
    const settings = await getCachedSettings();
    const resilience = resolveResilienceSettings(settings);
    return {
      windows,
      defaults: {
        globalThresholdPercent: resilience.quotaPreflight.defaultThresholdPercent,
        providerWindowDefaults: resilience.quotaPreflight.providerWindowDefaults,
      },
    };
  }

  async getProviderHealthMatrix(options: Record<string, unknown>) {
    const [{ breakers, lockouts }, { pools }] = await Promise.all([
      executeEdgeRuntimeCommand<{ breakers: unknown[]; lockouts: unknown[] }>({
        command: "provider-health.snapshot",
      }),
      executeEdgeRuntimeCommand<{ pools: { providers: any[] } }>({
        command: "sessions.snapshot",
      }),
    ]);
    return buildProviderHealthMatrix(options, {
      getAllCircuitBreakerStatuses: () => breakers,
      getAllModelLockouts: () => lockouts,
      resolveProviderAlias,
      getWebSessionPoolHealth: (provider?: string) => ({
        providers: provider ? pools.providers.filter((entry) => entry.provider === provider) : pools.providers,
      }),
    });
  }

  // Handlers for models & nodes
  async handleRefreshProvider(request: Request, id: string) {
    return handleProviderRefresh(request, id);
  }

  async handleGetProviderModels(request: Request) {
    return getProviderModelsHandler(request);
  }

  async handleCreateProviderModel(request: Request) {
    return addProviderModelHandler(request);
  }

  async handleUpdateProviderModel(request: Request) {
    return updateProviderModelHandler(request);
  }

  async handlePatchProviderModel(request: Request) {
    return patchProviderModelHandler(request);
  }

  async handleDeleteProviderModel(request: Request) {
    return deleteProviderModelHandler(request);
  }

  async handleGetProviderNodes(request: Request) {
    return getProviderNodesHandler(request);
  }

  async handleCreateProviderNode(request: Request) {
    return createProviderNodeHandler(request);
  }

  async handleUpdateProviderNode(request: Request, id: string) {
    return updateProviderNodeHandler(request, { params: { id } });
  }

  async handleDeleteProviderNode(request: Request, id: string) {
    return deleteProviderNodeHandler(request, { params: { id } });
  }

  async handleValidateProviderNode(request: Request) {
    return validateProviderNodeHandler(request);
  }

  async handleValidateProvider(request: Request) {
    return validateProviderHandler(request);
  }

  async handleChatgptWebCodexDoctor(request: Request, id: string) {
    return getChatgptWebCodexDoctor(request, id);
  }

  async handleRefreshProviderToken(request: Request, id: string) {
    return refreshProviderToken(request, id);
  }

  async handleRefreshCursorToken(request: Request, id: string) {
    return refreshCursorToken(request, id);
  }
}
