import { Injectable } from "@nestjs/common";
import {
  listPlugins,
  getPluginByName,
  updatePluginConfig,
  type PluginRow,
} from "@shiguang-gateway/core-domain/plugins/db";
import { pluginManager } from "@shiguang-gateway/core-domain/plugins/manager";
import { listMarketplacePlugins, installMarketplacePlugin } from "@shiguang-gateway/core-domain/plugins/marketplace";

function formatPlugin(row: any) {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    author: row.author,
    status: row.status,
    enabled: row.enabled === 1,
    hooks: JSON.parse(row.hooks || "[]"),
    permissions: JSON.parse(row.permissions || "[]"),
    installedAt: row.installedAt,
    updatedAt: row.updatedAt,
    activatedAt: row.activatedAt,
  };
}

@Injectable()
export class PluginsService {
  listPlugins(status?: PluginRow["status"]) {
    const plugins = listPlugins(status || undefined);
    return plugins.map(formatPlugin);
  }

  async installPlugin(path: string) {
    const plugin = await pluginManager.install(path);
    return formatPlugin(plugin);
  }

  getPlugin(name: string) {
    const plugin = getPluginByName(name);
    if (!plugin) return null;
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      license: plugin.license,
      main: plugin.main,
      source: plugin.source,
      tags: JSON.parse(plugin.tags || "[]"),
      status: plugin.status,
      enabled: plugin.enabled === 1,
      config: JSON.parse(plugin.config || "{}"),
      configSchema: JSON.parse(plugin.configSchema || "{}"),
      hooks: JSON.parse(plugin.hooks || "[]"),
      permissions: JSON.parse(plugin.permissions || "[]"),
      pluginDir: plugin.pluginDir,
      errorMessage: plugin.errorMessage,
      installedAt: plugin.installedAt,
      updatedAt: plugin.updatedAt,
      activatedAt: plugin.activatedAt,
    };
  }

  async uninstallPlugin(name: string) {
    await pluginManager.uninstall(name);
    return { success: true, message: `Plugin '${name}' uninstalled` };
  }

  async activatePlugin(name: string) {
    await pluginManager.activate(name);
    return { success: true, message: `Plugin '${name}' activated` };
  }

  async deactivatePlugin(name: string) {
    await pluginManager.deactivate(name);
    return { success: true, message: `Plugin '${name}' deactivated` };
  }

  getPluginConfig(name: string) {
    const plugin = getPluginByName(name);
    if (!plugin) return null;
    return {
      config: JSON.parse(plugin.config || "{}"),
      configSchema: JSON.parse(plugin.configSchema || "{}"),
    };
  }

  updatePluginConfig(name: string, config: Record<string, unknown>) {
    const plugin = getPluginByName(name);
    if (!plugin) return null;

    const configSchema = JSON.parse(plugin.configSchema || "{}");
    if (Object.keys(configSchema).length > 0) {
      for (const [key, value] of Object.entries(config)) {
        const field = configSchema[key];
        if (!field) continue;
        if (field.type === "number" && typeof value === "number") {
          if (field.min !== undefined && value < field.min) {
            throw new Error(`Config '${key}' must be >= ${field.min}`);
          }
          if (field.max !== undefined && value > field.max) {
            throw new Error(`Config '${key}' must be <= ${field.max}`);
          }
        }
        if (field.type === "select" && field.enum && !field.enum.includes(String(value))) {
          throw new Error(`Config '${key}' must be one of: ${field.enum.join(", ")}`);
        }
      }
    }

    updatePluginConfig(name, config);
    return { success: true, config };
  }

  async listMarketplace() {
    return listMarketplacePlugins();
  }

  async installMarketplace(name: string) {
    return installMarketplacePlugin(name);
  }

  async scan() {
    return pluginManager.scan();
  }
}
