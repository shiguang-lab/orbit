import { Injectable } from "@nestjs/common";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/db/settings";
import {
  getSystemPromptConfig,
  setSystemPromptConfig,
} from "@shiguang-gateway/open-sse/services/systemPrompt";
import {
  getThinkingBudgetConfig,
  setThinkingBudgetConfig,
} from "@shiguang-gateway/open-sse/services/thinkingBudget";
import {
  getDatabaseSettings,
  updateDatabaseSettings,
} from "@shiguang-gateway/core-domain/control/database-settings";
import { getDatabaseStats } from "@shiguang-gateway/core-domain/db/database-stats";
import { getState as getVacuumState, runNow as runVacuumNow } from "@shiguang-gateway/core-domain/db/vacuum-scheduler";
import {
  ADAPTIVE_VIRTUAL_LANES_FLAG_KEY,
  FEATURE_FLAG_DEFINITIONS,
  clearAllFeatureFlagOverrides,
  getCcAliasGlobalState,
  getFeatureFlagOverrides,
  removeFeatureFlagOverride,
  resolveAdaptiveVirtualLanesFlag,
  resolveAllFeatureFlags,
  setFeatureFlagOverride,
} from "@shiguang-gateway/core-domain/runtime/feature-flags";
import {
  GET as getRootSettings,
  PATCH as patchRootSettings,
  PUT as putRootSettings,
} from "./handlers/root.handler.js";

/** Use cases for settings that alter model request construction at runtime. */
@Injectable()
export class SettingsService {
  getRoot(request: Request) {
    return getRootSettings(request);
  }

  patchRoot(request: Request) {
    return patchRootSettings(request);
  }

  putRoot(request: Request) {
    return putRootSettings(request);
  }

  getSystemPrompt() {
    return getSystemPromptConfig();
  }

  async updateSystemPrompt(config: Record<string, unknown>) {
    setSystemPromptConfig(config);
    await updateSettings({ systemPrompt: config });
    return getSystemPromptConfig();
  }

  getThinkingBudget() {
    return getThinkingBudgetConfig();
  }

  async updateThinkingBudget(config: Record<string, unknown>) {
    setThinkingBudgetConfig(config);
    await updateSettings({ thinkingBudget: config });
    return getThinkingBudgetConfig();
  }

  async getPersistedSettings() {
    return getSettings();
  }

  getDatabaseSettings() {
    return getDatabaseSettings();
  }

  updateDatabaseSettings(patch: Record<string, unknown>) {
    return updateDatabaseSettings(patch as Parameters<typeof updateDatabaseSettings>[0]);
  }

  getDatabaseSettingsAfterUpdate(patch: Record<string, unknown>) {
    this.updateDatabaseSettings(patch);
    return this.getDatabaseSettings();
  }

  getVacuumState() {
    return getVacuumState();
  }

  runVacuum() {
    return runVacuumNow();
  }

  getDatabaseStats() {
    return getDatabaseStats();
  }

  getFeatureFlags() {
    const flags = resolveAllFeatureFlags().map(({ key, effectiveValue, source, definition }) => {
      let value = effectiveValue;
      let resolvedSource = source;
      if (key === "EXPOSE_CC_DISCOVERY_ALIASES") {
        const state = getCcAliasGlobalState();
        value = state.enabled ? "true" : "false";
        resolvedSource = state.source;
      } else if (key === ADAPTIVE_VIRTUAL_LANES_FLAG_KEY) {
        const state = resolveAdaptiveVirtualLanesFlag();
        value = state.enabled ? "true" : "false";
        resolvedSource = state.source;
      }
      return {
        key: definition.key,
        label: definition.label,
        description: definition.description,
        category: definition.category,
        type: definition.type,
        enumValues: definition.enumValues ?? null,
        defaultValue: definition.defaultValue,
        effectiveValue: value,
        source: resolvedSource,
        requiresRestart: definition.requiresRestart,
        warningLevel: definition.warningLevel,
      };
    });
    const active = flags.filter((flag) => ["true", "1", "yes"].includes(flag.effectiveValue)).length;
    return {
      flags,
      summary: {
        total: flags.length,
        active,
        inactive: flags.length - active,
        overriddenByDb: flags.filter((flag) => flag.source === "db").length,
        overriddenByEnv: flags.filter((flag) => flag.source === "env").length,
      },
    };
  }

  updateFeatureFlag(key: string, value?: string) {
    const definition = FEATURE_FLAG_DEFINITIONS.find((item) => item.key === key);
    if (!definition) throw new Error(`Unknown feature flag key: ${key}`);
    if (
      value !== undefined &&
      definition.type === "enum" &&
      definition.enumValues &&
      !definition.enumValues.includes(value)
    ) {
      throw new Error(
        `Invalid value "${value}" for enum flag ${key}. Allowed: ${definition.enumValues.join(", ")}`,
      );
    }
    const before = resolveAllFeatureFlags().find((item) => item.key === key);
    const previousValue = before?.effectiveValue ?? definition.defaultValue;
    const previousSource = before?.source ?? "default";
    if (value === undefined) removeFeatureFlagOverride(key);
    else setFeatureFlagOverride(key, value);
    const after = resolveAllFeatureFlags().find((item) => item.key === key);
    let effectiveValue = after?.effectiveValue ?? definition.defaultValue;
    let source = after?.source ?? "default";
    if (key === ADAPTIVE_VIRTUAL_LANES_FLAG_KEY) {
      const state = resolveAdaptiveVirtualLanesFlag();
      effectiveValue = state.enabled ? "true" : "false";
      source = state.source;
    }
    return {
      key,
      effectiveValue,
      source,
      previousValue,
      previousSource,
      requiresRestart: definition.requiresRestart,
    };
  }

  clearFeatureFlagOverrides() {
    const count = Object.keys(getFeatureFlagOverrides()).length;
    clearAllFeatureFlagOverrides();
    return {
      cleared: count,
      message: `Cleared ${count} feature flag override${count !== 1 ? "s" : ""}`,
    };
  }
}
