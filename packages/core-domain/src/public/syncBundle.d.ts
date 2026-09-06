export interface ConfigSyncBundle {
  settings: Record<string, unknown>;
  providerConnections: Record<string, unknown>[];
  providerNodes: Record<string, unknown>[];
  modelAliases: Record<string, unknown>;
  combos: Record<string, unknown>[];
  apiKeys: Record<string, unknown>[];
  reasoningRoutingRules: Record<string, unknown>[];
}
export function buildConfigSyncEnvelope(): Promise<{ version: string; bundle: ConfigSyncBundle }>;
