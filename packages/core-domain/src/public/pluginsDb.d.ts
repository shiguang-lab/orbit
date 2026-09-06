export interface PluginRow {
  id: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  license: string;
  main: string;
  source: string;
  tags: string;
  status: "installed" | "active" | "inactive" | "error";
  enabled: number;
  manifest: string;
  config: string;
  configSchema: string;
  hooks: string;
  permissions: string;
  pluginDir: string;
  errorMessage: string | null;
  installedAt: string;
  updatedAt: string;
  activatedAt: string | null;
}

export function listPlugins(status?: string): PluginRow[];
export function getPluginByName(name: string): PluginRow | null;
export function updatePluginConfig(name: string, config: Record<string, unknown>): boolean;
export { getPluginAnalytics, getPluginAnalyticsSummary } from "../lib/db/plugins.js";
