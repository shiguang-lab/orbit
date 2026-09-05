import { Injectable } from "@nestjs/common";
import { getProviderMetrics } from "@shiguang-gateway/core-domain/db/call-log-stats";
import { toNumber } from "@shiguang-gateway/core-domain/shared/numeric";
import {
  getModelCallStats,
  getProviderCallStats,
} from "@shiguang-gateway/core-domain/db/provider-stats";
import { AI_PROVIDERS } from "@shiguang-gateway/core-domain/catalog/provider-metadata";
import { getAllComboMetrics } from "@shiguang-gateway/core-domain/metrics/combo";
import { getTelemetrySummary } from "@shiguang-gateway/core-domain/metrics/request-telemetry";
import { getToolLatencyByProvider } from "@shiguang-gateway/core-domain/metrics/tool-latency";
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
} from "@shiguang-gateway/core-domain/control/provider-models-route";
import {
  GET as getProviderNodesHandler,
  POST as createProviderNodeHandler,
} from "@shiguang-gateway/core-domain/control/provider-nodes-route";
import {
  DELETE as deleteProviderNodeHandler,
  PUT as updateProviderNodeHandler,
} from "@shiguang-gateway/core-domain/control/provider-node-by-id-route";
import { POST as validateProviderNodeHandler } from "@shiguang-gateway/core-domain/control/provider-nodes-validate-route";

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

  getStats() {
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
}
