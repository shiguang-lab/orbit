import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import {
  checkCertInstalled,
  checkDNSEntryForAgent,
  getMitmStatus,
  resolveMitmDataDir,
  summarizeDiagnostics,
} from "@orbit/core/control/agent-bridge";
import { agentBridgePersistence } from "../agent-bridge.persistence.js";
import { failure } from "./common.js";

function probeTcp(port: number, host = "127.0.0.1", timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (ok: boolean) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const agentId = new URL(request.url).searchParams.get("agentId") ?? undefined;
    const status = await getMitmStatus(agentId);
    const certPath = path.join(resolveMitmDataDir(), "mitm", "server.crt");
    const certExists = fs.existsSync(certPath);
    const certTrusted = certExists ? await checkCertInstalled(certPath) : false;
    const port = Number(process.env.MITM_LOCAL_PORT) > 0 ? Number(process.env.MITM_LOCAL_PORT) : 443;
    const serverReachable = status.running ? await probeTcp(port) : false;
    let dnsConfigured = status.dnsConfigured ?? false;
    if (!agentId) {
      const states = agentBridgePersistence.getAllAgentBridgeStates();
      dnsConfigured = states.length > 0 && states.some((state) => state.dns_enabled && checkDNSEntryForAgent(state.agent_id));
    }
    return Response.json({
      ...summarizeDiagnostics({ serverRunning: status.running, serverReachable, certExists, certTrusted, dnsConfigured }),
      port,
    });
  } catch (error) { return failure(error); }
}
