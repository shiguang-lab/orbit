import { Injectable } from "@nestjs/common";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/control/settings";
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

/** Use cases for settings that alter model request construction at runtime. */
@Injectable()
export class SettingsService {
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
}
