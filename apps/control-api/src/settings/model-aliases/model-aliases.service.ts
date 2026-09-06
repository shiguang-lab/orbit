import { Injectable } from "@nestjs/common";
import {
  addCustomAlias,
  getAllAliases,
  getBuiltInAliases,
  getCustomAliases,
  removeCustomAlias,
  setCustomAliases,
} from "@shiguang-gateway/open-sse/services/modelDeprecation";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/control/settings";

/** Use cases for operator-managed model deprecation aliases. */
@Injectable()
export class ModelAliasesService {
  async getAliases() {
    // Hydrate the process-local resolver from persisted settings when needed.
    // This also handles separate module graphs in standalone deployments.
    const custom = getCustomAliases();
    if (Object.keys(custom).length === 0) {
      try {
        const settings = await getSettings();
        const stored = settings.modelAliases;
        if (stored && typeof stored === "object" && Object.keys(stored).length > 0) {
          setCustomAliases(stored as Record<string, string>);
        }
      } catch {
        // Best-effort hydration; an unavailable settings store should not hide built-ins.
      }
    }
    return {
      builtIn: getBuiltInAliases(),
      custom: getCustomAliases(),
      all: getAllAliases(),
    };
  }

  async replaceAliases(aliases: Record<string, string>) {
    setCustomAliases(aliases);
    await updateSettings({ modelAliases: aliases });
    return { success: true, custom: getCustomAliases() };
  }

  async addAlias(from: string, to: string) {
    addCustomAlias(from, to);
    const custom = getCustomAliases();
    await updateSettings({ modelAliases: custom });
    return { success: true, custom };
  }

  async removeAlias(from: string) {
    if (!removeCustomAlias(from)) return null;
    const custom = getCustomAliases();
    await updateSettings({ modelAliases: custom });
    return { success: true, custom };
  }
}
