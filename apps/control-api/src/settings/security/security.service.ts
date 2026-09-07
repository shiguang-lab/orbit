import { Injectable } from "@nestjs/common";
import {
  getSettings,
} from "@shiguang-gateway/core-domain/db/settings";
import { getNodeRuntimeSupport } from "./node-runtime-support.js";
import { normalizeAutoDisableBannedScope } from "@shiguang-gateway/core-domain/resilience/auto-disable-banned";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";
import {
  applyPersistedRuntimeSettings,
  updatePersistedRuntimeSettings,
} from "../runtime-settings-persistence.js";
import { readIpFilterConfig, writeIpFilterConfig } from "./ip-filter.repository.js";
import { getCorsStatus } from "@shiguang-gateway/core-domain/shared/cors-status";
import {
  ALWAYS_PROTECTED_API_PATHS,
  LOCAL_ONLY_API_PREFIXES,
  LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES,
  SPAWN_CAPABLE_PREFIXES,
} from "@shiguang-gateway/core-domain/shared/authz-route-policy";
import { isDashboardSessionAuthenticated, isAuthRequired } from "@shiguang-gateway/core-domain/control/authenticated";
import { extractApiKey, isValidApiKey } from "@shiguang-gateway/open-sse/services/auth";

export interface AutoDisableAccountsConfig {
  enabled: boolean;
  threshold: number;
  scope: string;
}

@Injectable()
export class SettingsSecurityService {
  nodeCompatibility() {
    const { nodeVersion, nodeCompatible } = getNodeRuntimeSupport();
    return { nodeVersion, nodeCompatible };
  }

  async getAutoDisableAccounts(): Promise<AutoDisableAccountsConfig> {
    const settings = await getSettings();
    return {
      enabled: Boolean(settings.autoDisableBannedAccounts),
      threshold:
        typeof settings.autoDisableBannedThreshold === "number"
          ? settings.autoDisableBannedThreshold
          : 3,
      scope: normalizeAutoDisableBannedScope(settings.autoDisableBannedScope),
    };
  }

  async updateAutoDisableAccounts(body: Record<string, unknown>) {
    await updatePersistedRuntimeSettings({
      autoDisableBannedAccounts: body.enabled,
      ...(body.threshold !== undefined && { autoDisableBannedThreshold: body.threshold }),
      ...(body.scope !== undefined && { autoDisableBannedScope: body.scope }),
    });
    return this.getAutoDisableAccounts();
  }

  getBackgroundDegradation(): Promise<Record<string, unknown>> {
    return executeEdgeRuntimeCommand<Record<string, unknown>>({
      command: "background-degradation.snapshot",
    });
  }

  async updateBackgroundDegradation(config: Record<string, unknown>) {
    const settings = await getSettings();
    if (settings.hidePaidModels === true && config.degradationMap && typeof config.degradationMap === "object") {
      const targets = Object.values(config.degradationMap as Record<string, unknown>)
        .filter((target): target is string => typeof target === "string" && target.length > 0);
      const classification = await executeEdgeRuntimeCommand<{ paidTargets: string[] }>({
        command: "model-access.classify",
        targets,
      });
      if (classification.paidTargets.length > 0) return { blocked: true } as const;
    }
    const current = await this.getBackgroundDegradation();
    const persistable = { ...current, ...config };
    delete persistable.stats;
    await updatePersistedRuntimeSettings({ backgroundDegradation: persistable });
    const applied = await this.getBackgroundDegradation();
    return { blocked: false, config: applied } as const;
  }

  resetBackgroundStats() {
    return executeEdgeRuntimeCommand({ command: "background-degradation.reset-stats" });
  }

  getIpFilter() {
    return executeEdgeRuntimeCommand({ command: "ip-filter.snapshot" });
  }

  async updateIpFilter(body: Record<string, any>) {
    const config = readIpFilterConfig();
    if (typeof body.enabled === "boolean") config.enabled = body.enabled;
    if (typeof body.mode === "string") config.mode = body.mode;
    if (Array.isArray(body.blacklist)) config.blacklist = [...body.blacklist];
    if (Array.isArray(body.whitelist)) config.whitelist = [...body.whitelist];
    const normalize = (value: string) => value.replace(/^::ffff:/, "").trim();
    if (body.addBlacklist) config.blacklist = Array.from(new Set([...config.blacklist, normalize(body.addBlacklist)]));
    if (body.removeBlacklist) config.blacklist = config.blacklist.filter((entry) => entry !== normalize(body.removeBlacklist));
    if (body.addWhitelist) config.whitelist = Array.from(new Set([...config.whitelist, normalize(body.addWhitelist)]));
    if (body.removeWhitelist) config.whitelist = config.whitelist.filter((entry) => entry !== normalize(body.removeWhitelist));
    writeIpFilterConfig(config);
    await applyPersistedRuntimeSettings();
    if (body.tempBan) {
      await executeEdgeRuntimeCommand({
        command: "ip-filter.temp-ban",
        ip: body.tempBan.ip,
        durationMs: body.tempBan.durationMs || 3600000,
        reason: body.tempBan.reason || "Manual ban",
      });
    }
    if (body.removeBan) {
      await executeEdgeRuntimeCommand({ command: "ip-filter.remove-temp-ban", ip: body.removeBan });
    }
    return this.getIpFilter();
  }

  async getPayloadRules() {
    return executeEdgeRuntimeCommand({ command: "payload-rules.snapshot" });
  }

  async updatePayloadRules(body: unknown) {
    const config = body;
    await updatePersistedRuntimeSettings({ payloadRules: config });
    return config;
  }

  async getAuthzInventory(request: Request) {
    if (await isAuthRequired(request)) {
      if (!(await isDashboardSessionAuthenticated(request))) {
        const apiKey = extractApiKey(request);
        if (!apiKey) return { error: { status: 401, body: { error: "Authentication required" } } } as const;
        try {
          if (!(await isValidApiKey(apiKey))) return { error: { status: 403, body: { error: "Invalid API key" } } } as const;
        } catch {
          return { error: { status: 503, body: { error: "Service temporarily unavailable" } } } as const;
        }
      }
    }
    const settings = await getSettings();
    return {
      tiers: [
        { name: "LOCAL_ONLY", prefixes: [...LOCAL_ONLY_API_PREFIXES], description: "Loopback-only routes.", bypassable: LOCAL_ONLY_API_PREFIXES.some((prefix) => LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES.includes(prefix) && !SPAWN_CAPABLE_PREFIXES.some((p) => prefix === p || prefix.startsWith(p))) },
        { name: "ALWAYS_PROTECTED", prefixes: [...ALWAYS_PROTECTED_API_PATHS], description: "Auth required unconditionally.", bypassable: false },
        { name: "MANAGEMENT", prefixes: ["/api/settings", "/api/providers/", "/api/api-keys"], description: "Default tier for /api/* admin endpoints.", bypassable: false },
        { name: "CLIENT_API", prefixes: ["/v1/", "/api/v1/", "/v1beta/", "/api/v1beta/"], description: "Client-facing inference APIs.", bypassable: false },
        { name: "PUBLIC", prefixes: ["/api/health", "/api/version", "/_next/"], description: "Unauthenticated routes.", bypassable: false },
      ],
      bypassEnabled: typeof settings.localOnlyManageScopeBypassEnabled === "boolean" ? settings.localOnlyManageScopeBypassEnabled : true,
      bypassPrefixes: Array.isArray(settings.localOnlyManageScopeBypassPrefixes) ? settings.localOnlyManageScopeBypassPrefixes.filter((p): p is string => typeof p === "string") : [...LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES],
      spawnCapablePrefixes: [...SPAWN_CAPABLE_PREFIXES],
      cors: getCorsStatus(),
    };
  }
}
