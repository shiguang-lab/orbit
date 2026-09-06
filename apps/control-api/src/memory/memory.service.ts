import { Injectable } from "@nestjs/common";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/control/settings";
import {
  invalidateMemorySettingsCache,
  normalizeMemorySettings,
  toMemorySettingsUpdates,
} from "@shiguang-gateway/core-domain/memory/settings";

/** Control-plane use cases for persistent memory configuration. */
@Injectable()
export class MemoryService {
  async getSettings() {
    const settings = await getSettings();
    return normalizeMemorySettings(settings);
  }

  async updateSettings(input: Record<string, unknown>) {
    const updates = toMemorySettingsUpdates(input);
    const settings = await updateSettings(updates);
    invalidateMemorySettingsCache();
    return normalizeMemorySettings(
      settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {},
    );
  }
}
