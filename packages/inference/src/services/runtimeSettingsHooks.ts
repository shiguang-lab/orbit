import { registerProviderRuntimeSettingsPort } from "@orbit/core/runtime/provider-settings-port";
import { registerResilienceRuntimeSettingsPort } from "@orbit/core/resilience/settings-runtime";
function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entryValue]) => [
        key.trim(),
        typeof entryValue === "string" ? entryValue.trim() : "",
      ])
      .filter(([key, entryValue]) => key.length > 0 && entryValue.length > 0),
  );
}

let runtimeSettingsPortInstalled = false;
let resilienceRuntimeSettingsPortInstalled = false;

export function installResilienceRuntimeSettingsPort(): void {
  if (resilienceRuntimeSettingsPortInstalled) return;
  registerResilienceRuntimeSettingsPort({
    async applyRequestQueueSettings(settings) {
      const { applyRequestQueueSettings } = await import("./rateLimitManager.ts");
      await applyRequestQueueSettings(settings);
    },
    async setProviderQuotaOverrides(settings) {
      const { setProviderQuotaOverrides } = await import("./providerDefaultRateLimit.ts");
      setProviderQuotaOverrides(settings);
    },
    async resetAllCircuitBreakers() {
      const { resetAllCircuitBreakers } = await import(
        "@orbit/core/resilience/circuit-breaker"
      );
      resetAllCircuitBreakers();
    },
  });
  resilienceRuntimeSettingsPortInstalled = true;
}

export function installRuntimeSettingsPort(): void {
  if (runtimeSettingsPortInstalled) return;
  registerProviderRuntimeSettingsPort({
  async applyPayloadRules(value) {
    const { clearPayloadRulesConfigOverride, setPayloadRulesConfig } = await import("./payloadRules.js");
    if (value === null || value === undefined) clearPayloadRulesConfigOverride();
    else setPayloadRulesConfig(value);
  },
  async applyModelAliases(value) {
    const { setCustomAliases } = await import("./modelDeprecation.js");
    setCustomAliases(value);
  },
  async applyBackgroundDegradation(value) {
    const {
      getDefaultDegradationMap,
      getDefaultDetectionPatterns,
      setBackgroundDegradationConfig,
    } = await import("./backgroundTaskDetector.js");
    if (!value) {
      setBackgroundDegradationConfig({
        enabled: false,
        degradationMap: getDefaultDegradationMap(),
        detectionPatterns: getDefaultDetectionPatterns(),
      });
      return;
    }
    const detectionPatterns = normalizeStringArray(value.detectionPatterns);
    setBackgroundDegradationConfig({
      enabled: value.enabled === true,
      degradationMap: {
        ...getDefaultDegradationMap(),
        ...normalizeStringRecord(value.degradationMap),
      },
      detectionPatterns:
        detectionPatterns.length > 0 ? detectionPatterns : getDefaultDetectionPatterns(),
    });
  },
  async applyCliCompatProviders(value) {
    const { setCliCompatProviders } = await import("../config/cliFingerprints.js");
    setCliCompatProviders(value);
  },
  async applyUsageTokenBuffer(value) {
    const { invalidateBufferTokensCache, setBufferTokensCache } = await import("../utils/usageTracking.js");
    if (typeof value === "number" && value >= 0) setBufferTokensCache(value);
    else invalidateBufferTokensCache();
  },
  async applyThoughtSignatureMode(value) {
    const { setGeminiThoughtSignatureMode } = await import("./geminiThoughtSignatureStore.js");
    setGeminiThoughtSignatureMode(value);
  },
  async applySystemTransforms(value) {
    const { resetSystemTransformsConfig, setSystemTransformsConfig } = await import("./systemTransforms.js");
    if (value === null || value === undefined || typeof value !== "object") {
      resetSystemTransformsConfig();
    } else {
      setSystemTransformsConfig(value);
    }
  },
  async setCustomBannedSignals(value) {
    const { setCustomBannedSignals } = await import("./accountFallback.js");
    setCustomBannedSignals(value);
  },
  async setOperatorProviderErrorRules(value) {
    const { setOperatorProviderErrorRules } = await import("../config/providerErrorRules.js");
    setOperatorProviderErrorRules(value);
  },
  });
  runtimeSettingsPortInstalled = true;
}
