import { Injectable } from "@nestjs/common";
import { jwtVerify } from "jose";
import {
  getSettings,
  updateSettings,
} from "@shiguang-gateway/core-domain/control/settings";
import {
  hashManagementPassword,
  hasManagementPasswordConfigured,
} from "@shiguang-gateway/core-domain/control/management-password";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { isFeatureFlagEnabled } from "@shiguang-gateway/core-domain/control/feature-flags";
import { getNodeRuntimeSupport } from "@shiguang-gateway/core-domain/shared/node-runtime-support";
import { normalizeAutoDisableBannedScope } from "@shiguang-gateway/core-domain/shared/auto-disable-banned";
import {
  getBackgroundDegradationConfig,
  setBackgroundDegradationConfig,
  resetStats,
} from "@shiguang-gateway/open-sse/services/backgroundTaskDetector";
import {
  configureIPFilter,
  getIPFilterConfig,
  addToBlacklist,
  removeFromBlacklist,
  addToWhitelist,
  removeFromWhitelist,
  tempBanIP,
  removeTempBan,
} from "@shiguang-gateway/open-sse/services/ipFilter";
import {
  getPayloadRulesConfig,
  normalizePayloadRulesConfig,
} from "@shiguang-gateway/open-sse/services/payloadRules";
import { isPaidModelTarget } from "@shiguang-gateway/core-domain/shared/free-models";
import { getCorsStatus } from "@shiguang-gateway/core-domain/shared/cors-status";
import {
  ALWAYS_PROTECTED_API_PATHS,
  LOCAL_ONLY_API_PREFIXES,
  LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES,
  SPAWN_CAPABLE_PREFIXES,
} from "@shiguang-gateway/core-domain/shared/authz-route-constants";
import { isDashboardSessionAuthenticated, isAuthRequired } from "@shiguang-gateway/core-domain/control/authenticated";
import { extractApiKey, isValidApiKey } from "@shiguang-gateway/core-domain/control/api-key-auth";

export interface AutoDisableAccountsConfig {
  enabled: boolean;
  threshold: number;
  scope: string;
}

@Injectable()
export class SettingsSecurityService {
  private jwtSecret(): Uint8Array | null {
    const secret = process.env.JWT_SECRET?.trim();
    return secret ? new TextEncoder().encode(secret) : null;
  }

  async checkSessionAuthenticated(request: Request): Promise<boolean> {
    try {
      const token = request.headers.get("cookie")?.match(/(?:^|;\s*)auth_token=([^;]+)/)?.[1];
      const secret = this.jwtSecret();
      if (!token || !secret) return false;
      await jwtVerify(decodeURIComponent(token), secret);
      return true;
    } catch {
      return false;
    }
  }

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
    await updateSettings({
      autoDisableBannedAccounts: body.enabled,
      ...(body.threshold !== undefined && { autoDisableBannedThreshold: body.threshold }),
      ...(body.scope !== undefined && { autoDisableBannedScope: body.scope }),
    });
    return this.getAutoDisableAccounts();
  }

  getBackgroundDegradation() {
    return getBackgroundDegradationConfig();
  }

  async updateBackgroundDegradation(config: Record<string, unknown>) {
    const settings = await getSettings();
    if (settings.hidePaidModels === true && config.degradationMap && typeof config.degradationMap === "object") {
      const blocked = Object.values(config.degradationMap as Record<string, unknown>).some(
        (target) => typeof target === "string" && isPaidModelTarget(target) === "paid",
      );
      if (blocked) return { blocked: true } as const;
    }
    setBackgroundDegradationConfig(config);
    const { stats: _stats, ...persistable } = getBackgroundDegradationConfig();
    await updateSettings({ backgroundDegradation: persistable });
    return { blocked: false, config: getBackgroundDegradationConfig() } as const;
  }

  resetBackgroundStats() {
    resetStats();
    return { success: true, stats: getBackgroundDegradationConfig().stats };
  }

  async getRequireLogin(request: Request) {
    const nodeInfo = this.nodeCompatibility();
    try {
      const settings = await getSettings();
      const oidcEnabled = Boolean(settings.oidcEnabled);
      return {
        authenticated: await this.checkSessionAuthenticated(request),
        requireLogin: settings.requireLogin !== false,
        hasPassword: hasManagementPasswordConfigured(settings),
        setupComplete: Boolean(settings.setupComplete),
        oidcEnabled,
        oidcDisablePasswordLogin:
          oidcEnabled &&
          (settings.oidcDisablePasswordLogin === true ||
            isFeatureFlagEnabled("SHIGUANG_GATEWAY_OIDC_DISABLE_PASSWORD_LOGIN") ||
            process.env.SHIGUANG_GATEWAY_OIDC_DISABLE_PASSWORD_LOGIN === "true" ||
            process.env.OIDC_DISABLE_PASSWORD_LOGIN === "true"),
        ...nodeInfo,
      };
    } catch {
      return {
        authenticated: false,
        requireLogin: true,
        hasPassword: true,
        setupComplete: true,
        oidcEnabled: false,
        oidcDisablePasswordLogin: false,
        ...nodeInfo,
      };
    }
  }

  async updateRequireLogin(request: Request, body: Record<string, unknown>) {
    const settings = await getSettings();
    if (hasManagementPasswordConfigured(settings) && !(await isAuthenticated(request))) {
      return { unauthorized: true } as const;
    }
    const updates: Record<string, unknown> = {};
    if (typeof body.requireLogin === "boolean") updates.requireLogin = body.requireLogin;
    if (body.password) updates.password = await hashManagementPassword(String(body.password));
    await updateSettings(updates);
    return { unauthorized: false, success: true } as const;
  }

  getIpFilter() {
    return getIPFilterConfig();
  }

  updateIpFilter(body: Record<string, any>) {
    if (body.enabled !== undefined || body.mode || body.blacklist || body.whitelist) configureIPFilter(body);
    if (body.addBlacklist) addToBlacklist(body.addBlacklist);
    if (body.removeBlacklist) removeFromBlacklist(body.removeBlacklist);
    if (body.addWhitelist) addToWhitelist(body.addWhitelist);
    if (body.removeWhitelist) removeFromWhitelist(body.removeWhitelist);
    if (body.tempBan) tempBanIP(body.tempBan.ip, body.tempBan.durationMs || 3600000, body.tempBan.reason || "Manual ban");
    if (body.removeBan) removeTempBan(body.removeBan);
    return getIPFilterConfig();
  }

  getPayloadRules() {
    return getPayloadRulesConfig();
  }

  async updatePayloadRules(body: unknown) {
    const config = normalizePayloadRulesConfig(body);
    await updateSettings({ payloadRules: config });
    return config;
  }

  async getAuthzInventory(request: Request) {
    if (await isAuthRequired(request)) {
      if (!(await isDashboardSessionAuthenticated(request))) {
        const apiKey = extractApiKey(request);
        if (!apiKey) return { error: { status: 401, body: { error: "Authentication required" } } } as const;
        if (!(await isValidApiKey(apiKey))) return { error: { status: 403, body: { error: "Invalid API key" } } } as const;
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
