import { Injectable } from "@nestjs/common";
import { getSettings } from "@shiguang-gateway/core-domain/db/settings";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";
import { updatePersistedRuntimeSettings } from "../runtime-settings-persistence.js";

/** Use cases for operator-managed model deprecation aliases. */
@Injectable()
export class ModelAliasesService {
  async getAliases() {
    return executeEdgeRuntimeCommand({ command: "model-aliases.snapshot" });
  }

  async replaceAliases(aliases: Record<string, string>) {
    await updatePersistedRuntimeSettings({ modelAliases: aliases });
    return { success: true, custom: aliases };
  }

  async addAlias(from: string, to: string) {
    const settings = await getSettings();
    const custom = { ...((settings.modelAliases as Record<string, string> | undefined) ?? {}), [from]: to };
    await updatePersistedRuntimeSettings({ modelAliases: custom });
    return { success: true, custom };
  }

  async removeAlias(from: string) {
    const settings = await getSettings();
    const custom = { ...((settings.modelAliases as Record<string, string> | undefined) ?? {}) };
    if (!(from in custom)) return null;
    delete custom[from];
    await updatePersistedRuntimeSettings({ modelAliases: custom });
    return { success: true, custom };
  }
}
