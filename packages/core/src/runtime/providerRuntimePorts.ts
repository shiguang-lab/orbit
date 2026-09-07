import type { PressureSeverity } from "@orbit/contracts/resource-pressure";

export type ParsedProviderModel = {
  provider: string | null;
  model: string | null;
  isAlias: boolean;
  providerAlias: string | null;
  extendedContext: boolean;
};

export type CodexQuotaHydration = {
  scope: "codex" | "spark";
  quotaState: {
    usage5h?: number;
    limit5h?: number;
    resetAt5h?: string | null;
    usage7d?: number;
    limit7d?: number;
    resetAt7d?: string | null;
  };
  exhaustedWindow: "5h" | "7d" | null;
} | null;

export type KimiRefreshResult = {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAtSec?: number;
  error?: string;
};

export interface ProviderRuntimePorts {
  parseModel(model: string | null | undefined): ParsedProviderModel;
  resolveCanonicalProviderModel(
    provider: string | null | undefined,
    model: string | null | undefined,
  ): { provider: string | null; model: string | null };
  getLearnedThinkingCap(
    provider: string | null | undefined,
    model: string | null | undefined,
  ): number | null;
  fetchUsageWithProxy(connection: unknown, proxy: unknown): Promise<unknown>;
  getAntigravityQuotaFamily(model: string | null | undefined): "gemini" | "claude" | "other";
  getCodexQuotaWindowFilter(model: string | null | undefined): ((window: string) => boolean) | undefined;
  getCodexQuotaHydration(connection: {
    id: string;
    provider: string;
    providerSpecificData?: Readonly<Record<string, unknown>> | null;
  }, requestedModel: string): CodexQuotaHydration;
  runWithProxy<T>(proxy: unknown, operation: () => Promise<T>): Promise<T>;
  getOriginalFetch(): typeof fetch;
  getPressureSeverity(): PressureSeverity;
  checkTokenLimits(apiKeyId: string, connectionId?: string, model?: string): {
    scopeType: string;
    scopeValue: string;
    tokensUsed: number;
    limitValue: number;
  } | null;
  hydrateRoutingSettings(settings: Record<string, unknown>): void;
  filterSelectableModels<T extends { id: string }>(provider: string, models: readonly T[]): T[];
  filterChatSelectableModels<T extends { id: string; supportedEndpoints?: readonly string[] }>(
    provider: string | null | undefined,
    models: readonly T[]
  ): T[];
  isObsoleteKiroModelAlias(modelId: unknown): boolean;
  estimateTokens(value: unknown): number;
  probeWebCookie(input: {
    provider: string;
    apiKey?: string;
    providerSpecificData?: Record<string, unknown>;
  }): Promise<{ valid: boolean; error?: string | null; errorCode?: string | null; unsupported?: boolean }>;
  getAccessToken(...args: any[]): Promise<any>;
  getTokenRefreshDeprecationNotice(provider: string): {
    migrateTo: string;
    reason: string;
  } | null;
  supportsTokenRefresh(provider: string): boolean;
  isUnrecoverableRefreshError(value: unknown): boolean;
  refreshCopilotToken(...args: any[]): Promise<any>;
  isKimiTokenExpiringSoon(token: string, thresholdSec?: number): boolean;
  exchangeKimiRefreshToken(refreshToken: string, baseUrl?: string): Promise<KimiRefreshResult>;
  createProxyDispatcher(proxyUrl: string): any;
  clearProxyDispatcherCache(): void;
  proxyConfigToUrl(proxy: unknown): string | null;
  rotationGroupFor(provider: string): string;
  proxyFetch: typeof fetch;
  normalizeDataUri(dataUri: string, opts?: { maxLongEdge?: number }): Promise<string>;
  getRegisteredProviderEffortBaseModelId(providerId: string, modelId: string): string | null;
  getAudioTranscriptionModels(): string[];
  resolveScoresAs(modelId: string): { base: string; via: string | null };
  searchRuntime: Record<string, any>;
  webFetchRuntime: Record<string, any>;
  reloadAdaptiveAdmissionRuntime(options: { env?: NodeJS.ProcessEnv }): unknown;
}

const missing = (name: keyof ProviderRuntimePorts): never => {
  throw new Error(`Provider runtime port '${name}' was used before runtime registration`);
};

const ports: ProviderRuntimePorts = {
  parseModel: () => missing("parseModel"),
  resolveCanonicalProviderModel: () => missing("resolveCanonicalProviderModel"),
  getLearnedThinkingCap: () => missing("getLearnedThinkingCap"),
  fetchUsageWithProxy: () => missing("fetchUsageWithProxy"),
  getAntigravityQuotaFamily: () => missing("getAntigravityQuotaFamily"),
  getCodexQuotaWindowFilter: () => missing("getCodexQuotaWindowFilter"),
  getCodexQuotaHydration: () => missing("getCodexQuotaHydration"),
  runWithProxy: (_proxy, operation) => operation(),
  getOriginalFetch: () => fetch,
  getPressureSeverity: () => "normal",
  checkTokenLimits: () => missing("checkTokenLimits"),
  hydrateRoutingSettings: () => missing("hydrateRoutingSettings"),
  filterSelectableModels: () => missing("filterSelectableModels"),
  filterChatSelectableModels: () => missing("filterChatSelectableModels"),
  isObsoleteKiroModelAlias: () => missing("isObsoleteKiroModelAlias"),
  estimateTokens: () => missing("estimateTokens"),
  probeWebCookie: () => missing("probeWebCookie"),
  getAccessToken: () => missing("getAccessToken"),
  getTokenRefreshDeprecationNotice: () => missing("getTokenRefreshDeprecationNotice"),
  supportsTokenRefresh: () => missing("supportsTokenRefresh"),
  isUnrecoverableRefreshError: () => missing("isUnrecoverableRefreshError"),
  refreshCopilotToken: () => missing("refreshCopilotToken"),
  isKimiTokenExpiringSoon: () => missing("isKimiTokenExpiringSoon"),
  exchangeKimiRefreshToken: () => missing("exchangeKimiRefreshToken"),
  createProxyDispatcher: () => missing("createProxyDispatcher"),
  clearProxyDispatcherCache: () => missing("clearProxyDispatcherCache"),
  proxyConfigToUrl: () => missing("proxyConfigToUrl"),
  rotationGroupFor: () => missing("rotationGroupFor"),
  proxyFetch: ((..._args: Parameters<typeof fetch>) => missing("proxyFetch")) as typeof fetch,
  normalizeDataUri: () => missing("normalizeDataUri"),
  getRegisteredProviderEffortBaseModelId: () => missing("getRegisteredProviderEffortBaseModelId"),
  getAudioTranscriptionModels: () => missing("getAudioTranscriptionModels"),
  resolveScoresAs: () => missing("resolveScoresAs"),
  searchRuntime: new Proxy({}, { get: () => missing("searchRuntime") }),
  webFetchRuntime: new Proxy({}, { get: () => missing("webFetchRuntime") }),
  reloadAdaptiveAdmissionRuntime: () => missing("reloadAdaptiveAdmissionRuntime"),
};

export function registerProviderRuntimePorts(next: Partial<ProviderRuntimePorts>): void {
  Object.assign(ports, next);
}

export const providerRuntimePorts = ports;
