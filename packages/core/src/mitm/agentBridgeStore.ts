/**
 * Persistence port used by the MITM runtime.
 *
 * Agent Bridge tables are owned by control.  The MITM runtime is shared
 * infrastructure, so it consumes this small port instead of importing the
 * control application's SQLite CRUD modules.  control registers its
 * implementation during module initialisation.
 */
import type {
  AgentBridgeBypassRow,
  AgentBridgeMappingRow,
  AgentBridgeStateRow,
} from "../shared/schemas/agentBridge.ts";

export interface AgentBridgeStore {
  getAllAgentBridgeStates(): AgentBridgeStateRow[];
  getUserBypassPatterns(): string[];
  getAllBypassPatterns(): AgentBridgeBypassRow[];
  getAgentBridgeState(agentId: string): AgentBridgeStateRow | null;
  upsertAgentBridgeState(
    row: Partial<AgentBridgeStateRow> & { agent_id: string },
  ): void;
  getMappingsForAgent(agentId: string): AgentBridgeMappingRow[];
  setMappings(agentId: string, mappings: Array<{ source: string; target: string }>): void;
  syncAgentBridgeMappingsToMitmAlias(agentId: string): void;
}

const emptyStore: AgentBridgeStore = {
  getAllAgentBridgeStates: () => [],
  getUserBypassPatterns: () => [],
  getAllBypassPatterns: () => [],
  getAgentBridgeState: () => null,
  upsertAgentBridgeState: () => undefined,
  getMappingsForAgent: () => [],
  setMappings: () => undefined,
  syncAgentBridgeMappingsToMitmAlias: () => undefined,
};

let activeStore: AgentBridgeStore = emptyStore;

/** Register the control application's Agent Bridge persistence adapter. */
export function configureAgentBridgeStore(store: AgentBridgeStore): void {
  activeStore = store;
}

/** Resolve the currently registered persistence adapter. */
export function getAgentBridgeStore(): AgentBridgeStore {
  return activeStore;
}

