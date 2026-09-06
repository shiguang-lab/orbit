import { info, warn } from "@shiguang-gateway/core-domain/sse/logger";
import { upsertDiscoveryResult } from "./discovery.repository.js";
import type { DiscoveryResult } from "./discovery.types.js";

export interface DiscoveryConfig {
  enabled: boolean;
  scanInterval: number;
  maxConcurrentScans: number;
  targetProviders: string[];
  notificationWebhook?: string;
}

export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  enabled: false,
  scanInterval: 24 * 60 * 60 * 1000,
  maxConcurrentScans: 3,
  targetProviders: [],
};

async function probeEndpoint(url: string): Promise<{ accessible: boolean; status?: number }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "ShiguangGateway-Discovery/1.0" },
    });
    return { accessible: response.ok, status: response.status };
  } catch {
    return { accessible: false };
  }
}

function configuredEndpoints(providerId: string, config: Partial<DiscoveryConfig>): string[] {
  const configured = (config as Partial<DiscoveryConfig> & { endpoints?: Record<string, unknown> }).endpoints?.[
    providerId
  ];
  if (Array.isArray(configured)) return configured.filter((value): value is string => typeof value === "string");
  const raw = process.env.SHIGUANG_GATEWAY_DISCOVERY_ENDPOINTS_JSON;
  if (!raw) return [];
  try {
    const values = (JSON.parse(raw) as Record<string, unknown>)[providerId];
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
  } catch {
    warn("DISCOVERY", "discovery.invalid_endpoint_config", { providerId });
    return [];
  }
}

export async function scanProvider(providerId: string, config: Partial<DiscoveryConfig> = {}): Promise<DiscoveryResult[]> {
  const endpoints = configuredEndpoints(providerId, config);
  if (endpoints.length === 0) {
    info("DISCOVERY", "discovery.no_configured_endpoints", { providerId });
    return [];
  }
  const results: DiscoveryResult[] = [];
  for (const endpoint of endpoints) {
    let parsed: URL;
    try {
      parsed = new URL(endpoint);
    } catch {
      warn("DISCOVERY", "discovery.invalid_endpoint", { providerId });
      continue;
    }
    if (parsed.protocol !== "https:") {
      warn("DISCOVERY", "discovery.endpoint_not_https", { providerId, endpoint: parsed.origin });
      continue;
    }
    const probe = await probeEndpoint(parsed.toString());
    const now = new Date().toISOString();
    results.push({
      providerId,
      method: "public_api",
      endpoint: parsed.toString(),
      authType: "none",
      feasibility: probe.accessible ? 3 : 1,
      riskLevel: "low",
      status: probe.accessible ? "verified" : "rejected",
      notes: probe.accessible
        ? `Endpoint responded with HTTP ${probe.status}`
        : "Endpoint was not reachable from the independent deployment",
      discoveredAt: now,
      verifiedAt: probe.accessible ? now : undefined,
    });
  }
  return results;
}

export function persistDiscoveryResult(result: DiscoveryResult): DiscoveryResult {
  return upsertDiscoveryResult(result);
}
