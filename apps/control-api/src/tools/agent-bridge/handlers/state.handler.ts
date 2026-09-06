import {
  ALL_TARGETS,
  checkCertInstalled,
  checkDNSEntryForAgent,
  getAllAgentsStatus,
  getCachedPassword,
  getMitmStatus,
  isSudoPasswordRequired,
  resolveMitmDataDir,
} from "@shiguang-gateway/core-domain/control/agent-bridge";
import { agentBridgePersistence } from "../agent-bridge.persistence.js";
import { failure } from "./common.js";
import fs from "node:fs";
import path from "node:path";

/** Return the complete AgentBridge dashboard state in one control-plane call. */
export async function GET(): Promise<Response> {
  try {
    const [serverStatus, agents, agentStates, bypassPatterns] = await Promise.all([
      getMitmStatus(),
      getAllAgentsStatus(),
      agentBridgePersistence.getAllAgentBridgeStates(),
      agentBridgePersistence.getAllBypassPatterns(),
    ]);
    const mappings = Object.fromEntries(
      ALL_TARGETS.map((target) => [
        target.id,
        agentBridgePersistence.getMappingsForAgent(target.id).map((row) => ({ source: row.source_model, target: row.target_model })),
      ]),
    );
    const certPath = path.join(resolveMitmDataDir(), "mitm", "server.crt");
    const certExists = fs.existsSync(certPath);
    const certTrusted = certExists ? await checkCertInstalled(certPath) : false;
    const dnsConfigured = agentStates.length > 0 && agentStates.some(
      (state) => state.dns_enabled && checkDNSEntryForAgent(state.agent_id),
    );
    const isWin = process.platform === "win32";
    const enrichedServer = {
      ...serverStatus,
      certExists,
      certTrusted,
      dnsConfigured,
      hasCachedPassword: !!getCachedPassword(),
      needsSudoPassword: !isWin && !getCachedPassword() && isSudoPasswordRequired(),
      isWin,
    };
    return Response.json({
      server: enrichedServer,
      agents,
      serverState: enrichedServer,
      agentStates,
      bypassPatterns: bypassPatterns.map((row) => row.pattern),
      mappings,
    });
  } catch (error) { return failure(error); }
}
