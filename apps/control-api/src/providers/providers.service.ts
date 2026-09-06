import { Injectable } from "@nestjs/common";
import { getProviderMetrics } from "@shiguang-gateway/core-domain/db/call-log-stats";
import { toNumber } from "@shiguang-gateway/core-domain/shared/numeric";
import {
  getModelCallStats,
  getProviderCallStats,
} from "@shiguang-gateway/core-domain/db/provider-stats";
import { AI_PROVIDERS } from "@shiguang-gateway/core-domain/catalog/provider-metadata";
import { getTelemetrySummary } from "@shiguang-gateway/core-domain/metrics/request-telemetry";
import { getProviderConnections } from "@shiguang-gateway/core-domain/db/provider-connections";
import {
  getSyncedAvailableModels,
  getAllSyncedAvailableModels,
} from "@shiguang-gateway/core-domain/control/synced-models";
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
} from "@shiguang-gateway/core-domain/control/openrouter-provider-stats";
import {
  buildProviderHealthMatrix,
} from "@shiguang-gateway/core-domain/control/provider-health-matrix";
import {
  getAllExpirations,
  getExpirationSummary,
} from "@shiguang-gateway/core-domain/control/provider-expiration";
import { resolveResilienceSettings } from "@shiguang-gateway/core-domain/control/resilience-settings";
import { getCachedSettings } from "@shiguang-gateway/core-domain/cache/services";

const load = (specifier: string): Promise<any> => import(specifier as string);

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
    const [{ getAllComboMetrics }, { getToolLatencyByProvider }] = await Promise.all([
      load("@shiguang-gateway/open-sse/services/comboMetrics.ts"),
      load("@shiguang-gateway/open-sse/services/toolLatencyTracker.ts"),
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
      comboMetrics: getAllComboMetrics(),
      telemetry: getTelemetrySummary(300_000),
      toolLatency: getToolLatencyByProvider(),
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

  async getOpenRouterStats(forceRefresh: boolean) {
    if (forceRefresh) return refreshOpenRouterProviderStats();
    return getOpenRouterProviderStats();
  }

  getProviderExpirations() {
    return { summary: getExpirationSummary(), list: getAllExpirations() };
  }

  async getQuotaWindows() {
    const { getAllProviderQuotaWindows } = await load(
      "@shiguang-gateway/open-sse/services/quotaPreflight"
    );
    const windows = getAllProviderQuotaWindows();
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
    return buildProviderHealthMatrix(options);
  }

  // Handlers for models & nodes
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
    return updateProviderNodeHandler(request, { params: { id } as any });
  }

  async handleDeleteProviderNode(request: Request, id: string) {
    return deleteProviderNodeHandler(request, { params: { id } as any });
  }

  async handleValidateProviderNode(request: Request) {
    return validateProviderNodeHandler(request);
  }

  async handleValidateProvider(request: Request) {
    return validateProviderHandler(request);
  }
}
