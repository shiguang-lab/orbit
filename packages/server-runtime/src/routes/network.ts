import os from "node:os";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { detectTailscale, isTailscaleIpv4, recordPassiveTailscaleHost } from "../lib/tailscale.js";

export async function networkRoutes(app: FastifyInstance): Promise<void> {
  app.get("/network/info", async (request: FastifyRequest, reply: FastifyReply) => {
    const incomingHost = request.headers["x-forwarded-host"] ?? request.headers.host;
    if (typeof incomingHost === "string") recordPassiveTailscaleHost(incomingHost);
    const host = typeof incomingHost === "string" ? incomingHost : undefined;
    const configuredPublicUrl = process.env.PUBLIC_BASE_URL?.trim();
    let publicOrigin: URL | null = null;
    if (configuredPublicUrl) {
      try { publicOrigin = new URL(configuredPublicUrl); } catch { /* use request host */ }
    }
    const port = publicOrigin?.port || (host?.includes(":") ? host.split(":")[1] : process.env.EDGE_GATEWAY_PORT || process.env.PORT || "8787");
    const lanUrls: string[] = [];
    const tsInfo = await detectTailscale({ port, incomingHost: host });
    for (const [ifaceName, addrs] of Object.entries(os.networkInterfaces())) {
      for (const addr of addrs ?? []) {
        if (addr.family !== "IPv4" || addr.internal) continue;
        if (!isTailscaleIpv4(addr.address) && !ifaceName.toLowerCase().startsWith("tailscale")) {
          lanUrls.push(`http://${addr.address}:${port}/v1`);
        }
      }
    }
    const tailscaleUrl = tsInfo.apiUrl || (tsInfo.tailscaleUrl ? `${tsInfo.tailscaleUrl.replace(/\/$/, "")}/v1` : null);
    const localUrl = publicOrigin ? `${publicOrigin.origin.replace(/\/$/, "")}/v1` : `http://localhost:${port}/v1`;
    return reply.send({ localUrl, lanUrls: [...new Set(lanUrls)], tailscaleUrl, tailscaleIpUrl: tsInfo.ip ? `http://${tsInfo.ip}:${port}/v1` : null, port: Number(port) || 8787, tailscaleDetails: { connected: tsInfo.connected, ip: tsInfo.ip, magicDns: tsInfo.magicDns, hostname: tsInfo.hostname, source: tsInfo.source } });
  });
}
