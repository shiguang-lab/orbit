import {
  AgentBridgeConfigSchema,
  ALL_TARGETS,
} from "@orbit/core/control/agent-bridge";
import {
  addCustomHost,
  listCustomHosts,
} from "@orbit/core/control/traffic-inspector";
import type {
  AgentBridgeConfig,
  AgentBridgeImportResult,
} from "@orbit/core/control/agent-bridge";
import { agentBridgePersistence } from "./agent-bridge.persistence.js";

export { AgentBridgeConfigSchema };
export type { AgentBridgeConfig, AgentBridgeImportResult };

/** Serialize operator-tunable Agent Bridge state for backup or replication. */
export function exportAgentBridgeConfig(): AgentBridgeConfig {
  const customHosts = listCustomHosts().map((host) => ({
    host: host.host,
    kind: host.kind ?? "custom",
    label: host.label ?? null,
  }));
  const agentMappings: AgentBridgeConfig["agentMappings"] = {};
  for (const target of ALL_TARGETS) {
    const rows = agentBridgePersistence.getMappingsForAgent(target.id);
    if (rows.length > 0) {
      agentMappings[target.id] = rows.map((row) => ({
        source: row.source_model,
        target: row.target_model,
      }));
    }
  }
  return {
    version: 1,
    bypassPatterns: agentBridgePersistence.getUserBypassPatterns(),
    customHosts,
    agentMappings,
  };
}

/** Apply a validated portable config; hosts remain idempotent and mappings replace per agent. */
export function importAgentBridgeConfig(config: AgentBridgeConfig): AgentBridgeImportResult {
  agentBridgePersistence.replaceUserBypassPatterns(config.bypassPatterns);
  for (const host of config.customHosts) {
    addCustomHost(host.host, host.kind, host.label ?? undefined);
  }
  for (const [agentId, mappings] of Object.entries(config.agentMappings)) {
    agentBridgePersistence.setMappings(agentId, mappings);
  }
  return {
    bypassPatterns: config.bypassPatterns.length,
    customHosts: config.customHosts.length,
    agents: Object.keys(config.agentMappings).length,
  };
}
