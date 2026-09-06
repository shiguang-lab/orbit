/**
 * Control-plane AgentBridge capabilities.
 *
 * The HTTP transport is owned by apps/control-api.  This explicit package
 * surface keeps the shared MITM implementation and its persistence port behind
 * a reviewable boundary while control-api owns the SQLite adapter and Nest
 * controllers/modules.
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
  AgentBridgeConfigSchema,
} from "../../shared/schemas/agentBridge.ts";
export { configureAgentBridgeStore, getAgentBridgeStore } from "../../mitm/agentBridgeStore.ts";
export { ALL_TARGETS, resolveTarget } from "../../mitm/targets/index.ts";
export { detectAgent } from "../../mitm/detection/index.ts";
export { globalTrafficBuffer } from "../../mitm/inspector/buffer.ts";
export {
  getMitmStatus,
  getAllAgentsStatus,
  getCachedPassword,
  setCachedPassword,
  repairMitm,
} from "../../mitm/manager.ts";
export { startMitm, stopMitm } from "../../mitm/manager.runtime.ts";
export { addDNSEntry, removeDNSEntry } from "../../mitm/dns/dnsConfig.ts";
export { checkCertInstalled, installCertResult, uninstallCert } from "../../mitm/cert/install.ts";
export { resolveMitmDataDir } from "../../mitm/dataDir.ts";
export { summarizeDiagnostics } from "../../mitm/inspector/diagnostics.ts";
export { checkDNSEntryForAgent, isSudoPasswordRequired } from "../../mitm/dns/dnsConfig.ts";
export { generateCert } from "../../mitm/cert/generate.ts";
export { configureUpstreamCa } from "../../mitm/upstreamTrust.ts";
export { startCaptureMode, stopCaptureMode, getCaptureStatus } from "../../mitm/tproxy/captureManager.ts";
export { installTproxyCa, uninstallTproxyCa } from "../../mitm/tproxy/caTrust.ts";
export {
  isMitmSudoPasswordRequired,
  normalizeMitmSudoPasswordInput,
  resolveMitmSudoPassword,
} from "../../mitm/sudoGate.ts";
