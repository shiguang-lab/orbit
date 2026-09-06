/**
 * Control-plane AgentBridge capabilities.
 *
 * The HTTP transport is owned by apps/control-api.  This explicit package
 * surface keeps the MITM implementation and its persisted state behind a
 * reviewable boundary while the control app owns Nest controllers/modules.
 */
export {
  AgentBridgeBypassUpsertSchema,
  AgentBridgeDnsActionSchema,
  AgentBridgeMappingPutSchema,
  AgentBridgeStateRowSchema,
  AgentBridgeMappingRowSchema,
  AgentBridgeBypassRowSchema,
  AgentBridgeServerActionSchema,
  AgentBridgeUpstreamCaPostSchema,
} from "../../shared/schemas/agentBridge.ts";
export { exportConfig, importConfig, AgentBridgeConfigSchema } from "./configPortability.ts";
export {
  getAllBypassPatterns,
  getUserBypassPatterns,
  replaceUserBypassPatterns,
} from "../db/agentBridgeBypass.ts";
export {
  getAllAgentBridgeStates,
  getAgentBridgeState,
  upsertAgentBridgeState,
} from "../db/agentBridgeState.ts";
export {
  getMappingsForAgent,
  setMappings,
  syncAgentBridgeMappingsToMitmAlias,
} from "../db/agentBridgeMappings.ts";
export { ALL_TARGETS, resolveTarget } from "../../mitm/targets/index.ts";
export { detectAgent } from "../../mitm/detection/index.ts";
export { globalTrafficBuffer } from "../../mitm/inspector/buffer.ts";
