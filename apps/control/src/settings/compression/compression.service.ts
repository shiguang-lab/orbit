import { Injectable } from "@nestjs/common";
import {
  getCompressionSettings,
  getMcpAccessibilityConfig,
  setMcpAccessibilityConfig,
  updateCompressionSettings,
} from "@orbit/core/control/compression-settings";
import { getCompressionRunTelemetrySummary } from "@orbit/core/db/compression-run-telemetry";
import { getCavemanRuleMetadata } from "@orbit/inference/services/compression/cavemanRules";
import {
  discoverRepeatedNoise,
} from "@orbit/inference/services/compression/engines/rtk";
import {
  getRtkFilterCatalog,
  getRtkFilterLoadDiagnostics,
  loadRtkFilters,
} from "@orbit/inference/services/compression/engines/rtk/filterLoader";
import {
  commandToId,
  detectCommandType,
  listRtkCommandSamples,
  processRtkText,
  readRtkRawOutput,
  suggestFilter,
} from "@orbit/inference/services/compression/engines/rtk";
import {
  installGlobalRtkTomlV1,
  parseRtkTomlV1,
  type RtkTomlCompatibilityResult,
} from "@orbit/inference/services/compression/engines/rtk/tomlCompatibility";
import {
  DEFAULT_RTK_CONFIG,
  type RtkConfig,
} from "@orbit/contracts/compression-settings";

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

  async getRtkConfig() {
    const settings = await getCompressionSettings();
    return settings.rtkConfig;
  }

  async updateRtkConfig(updates: Partial<RtkConfig>) {
    const current = await getCompressionSettings();
    const settings = await updateCompressionSettings({
      rtkConfig: {
        ...DEFAULT_RTK_CONFIG,
        ...(current.rtkConfig ?? {}),
        ...updates,
      },
    });
    return settings.rtkConfig;
  }

  getRtkDiscover(limit: number) {
    const samples = listRtkCommandSamples({ limit });
    return { sampleCount: samples.length, candidates: discoverRepeatedNoise(samples) };
  }

  getRtkFilters() {
    return { filters: getRtkFilterCatalog(), diagnostics: getRtkFilterLoadDiagnostics() };
  }

  getRtkLearn(command: string, limit: number) {
    const targetId = commandToId(command);
    const matching = listRtkCommandSamples({ limit }).filter(
      (sample) => commandToId(sample.command) === targetId,
    );
    return { command, sampleCount: matching.length, filter: suggestFilter(command, matching) };
  }

  testRtk(text: string, command: string | undefined, config: Record<string, unknown> | undefined) {
    const detection = detectCommandType(text, command);
    return {
      detection,
      ...processRtkText(text, { command, config }),
    };
  }

  readRtkRawOutput(id: string) {
    return readRtkRawOutput(id);
  }

  importRtkToml(
    action: "validate" | "install",
    content: string,
    overwrite?: boolean,
  ): RtkTomlCompatibilityResult & { installedPath?: string; backupCreated?: boolean } {
    const result =
      action === "install"
        ? installGlobalRtkTomlV1(content, { overwrite })
        : parseRtkTomlV1(content);
    if (action === "install") loadRtkFilters({ refresh: true });
    return result;
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
