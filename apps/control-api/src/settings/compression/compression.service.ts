import { Injectable } from "@nestjs/common";
import {
  getCompressionSettings,
  getMcpAccessibilityConfig,
  setMcpAccessibilityConfig,
  updateCompressionSettings,
} from "@shiguang-gateway/core-domain/control/compression-settings";
import { getCompressionRunTelemetrySummary } from "@shiguang-gateway/core-domain/db/compression-run-telemetry";
import { getCavemanRuleMetadata } from "@shiguang-gateway/open-sse/services/compression/cavemanRules";

const EMPTY_TELEMETRY_SUMMARY = {
  totalRuns: 0,
  totalTokensSaved: 0,
  runsWithStyles: 0,
  bypassCount: 0,
  totalOutputTokens: 0,
  appliedStyleCounts: {},
} as const;

/** Use cases for the control-plane compression settings surface. */
@Injectable()
export class CompressionSettingsService {
  getSettings() {
    return getCompressionSettings();
  }

  updateSettings(updates: Record<string, unknown>) {
    return updateCompressionSettings(updates);
  }

  getMcpAccessibility() {
    return getMcpAccessibilityConfig();
  }

  async updateMcpAccessibility(updates: Record<string, unknown>) {
    const current = await getMcpAccessibilityConfig();
    await setMcpAccessibilityConfig({ ...current, ...updates });
    return getMcpAccessibilityConfig();
  }

  getRunTelemetry() {
    try {
      return getCompressionRunTelemetrySummary();
    } catch {
      // Telemetry is best-effort and must never make the dashboard unavailable.
      return EMPTY_TELEMETRY_SUMMARY;
    }
  }

  getRules() {
    return { rules: getCavemanRuleMetadata() };
  }
}
