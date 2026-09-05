/**
 * Plugin Discovery Tool — Automated provider scanning.
 *
 * Scans LLM providers for free/unlimited access methods and reports findings.
 * Integrated into ShiguangGateway as an opt-in service (default off).
 *
 * Discovery is endpoint-driven and never fabricates a finding for a provider.
 *
 * @module discovery
 */

import { logger } from "../../../open-sse/utils/logger.ts";
import {
  upsertDiscoveryResult as dbUpsertDiscoveryResult,
  getDiscoveryResults as dbGetDiscoveryResults,
  type DiscoveryResult as DbDiscoveryResult,
} from "../db/discoveryResults";

const log = logger("DISCOVERY");

// ── Types ──

export interface DiscoveryConfig {
  enabled: boolean;
  scanInterval: number; // ms between scans (default: 24h)
  maxConcurrentScans: number;
  targetProviders: string[]; // empty = scan all known
  notificationWebhook?: string;
}

export interface DiscoveryResult {
  id?: number;
  providerId: string;
  method: "free_tier" | "web_cookie" | "auto_register" | "trial" | "public_api";
  endpoint?: string;
  authType: "none" | "cookie" | "api_key" | "oauth";
  models?: string[];
  rateLimit?: string;
  feasibility: number; // 1-5
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
  status: "pending" | "testing" | "verified" | "rejected";
  notes?: string;
  discoveredAt?: string;
  verifiedAt?: string;
}

// ── Default Config ──

export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  enabled: false,
  scanInterval: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentScans: 3,
  targetProviders: [],
};

// ── Probe ──

/**
 * Probe a single URL for API availability.
 */
export async function probeEndpoint(
  url: string,
  signal?: AbortSignal
): Promise<{ accessible: boolean; status?: number; hasModels?: boolean }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "ShiguangGateway-Discovery/1.0" },
      signal,
    });
    return {
      accessible: res.ok,
      status: res.status,
      hasModels: res.ok && url.includes("/models"),
    };
  } catch {
    return { accessible: false };
  }
}

// ── Scan ──

function configuredEndpoints(providerId: string, config: Partial<DiscoveryConfig>): string[] {
  const configured = (config as Partial<DiscoveryConfig> & { endpoints?: Record<string, unknown> }).endpoints?.[providerId];
  if (Array.isArray(configured)) return configured.filter((value): value is string => typeof value === "string");
  const raw = process.env.SHIGUANG_GATEWAY_DISCOVERY_ENDPOINTS_JSON;
  if (!raw) return [];
  try {
    const values = (JSON.parse(raw) as Record<string, unknown>)[providerId];
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
  } catch {
    log.warn("discovery.invalid_endpoint_config", { providerId });
    return [];
  }
}

/** Scan only explicitly configured HTTPS provider endpoints. */
export async function scanProvider(
  providerId: string,
  config: Partial<DiscoveryConfig> = {}
): Promise<DiscoveryResult[]> {
  const endpoints = configuredEndpoints(providerId, config);
  if (endpoints.length === 0) {
    log.info("discovery.no_configured_endpoints", { providerId });
    return [];
  }
  const results: DiscoveryResult[] = [];
  for (const endpoint of endpoints) {
    let parsed: URL;
    try { parsed = new URL(endpoint); } catch {
      log.warn("discovery.invalid_endpoint", { providerId });
      continue;
    }
    if (parsed.protocol !== "https:") {
      log.warn("discovery.endpoint_not_https", { providerId, endpoint: parsed.origin });
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
      notes: probe.accessible ? `Endpoint responded with HTTP ${probe.status}` : "Endpoint was not reachable from the independent deployment",
      discoveredAt: now,
      verifiedAt: probe.accessible ? now : undefined,
    });
  }
  return results;
}

// ── Results (Reporter — Phase 2) ──

/**
 * Persist a discovery finding to the `discovery_results` table via the DB
 * module. Uniqueness is keyed on `(providerId, method, endpoint)`, so
 * re-discovering the same endpoint updates the existing row. Returns the
 * persisted row (with its id).
 */
export function persistDiscoveryResult(result: DiscoveryResult): DiscoveryResult {
  return dbUpsertDiscoveryResult(result as DbDiscoveryResult) as DiscoveryResult;
}

/**
 * Get discovery results from the DB, optionally filtered to one provider.
 * Newest findings first.
 */
export function getDiscoveryResults(providerId?: string): DiscoveryResult[] {
  return dbGetDiscoveryResults(providerId) as DiscoveryResult[];
}

// ── Config ──

/**
 * Check if discovery service is enabled.
 */
export function isDiscoveryEnabled(): boolean {
  return DEFAULT_DISCOVERY_CONFIG.enabled;
}
