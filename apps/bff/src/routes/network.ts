import os from "node:os";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { detectTailscale, isTailscaleIpv4, recordPassiveTailscaleHost } from "../lib/tailscale.js";

export async function networkRoutes(app: FastifyInstance): Promise<void> {
  app.get("/network/info", async (request: FastifyRequest, reply: FastifyReply) => {
    // Record incoming host for passive Tailscale discovery
    const incomingHost = request.headers["x-forwarded-host"] ?? request.headers.host;
    if (typeof incomingHost === "string") {
      recordPassiveTailscaleHost(incomingHost);
    }

    const hostHeaderStr = typeof incomingHost === "string" ? incomingHost : undefined;
    const incomingPort = hostHeaderStr?.includes(":") ? hostHeaderStr.split(":")[1] : undefined;
    const port = incomingPort || process.env.PORT || "20128";

    const localUrl = `http://localhost:${port}/v1`;
    const lanUrls: string[] = [];

    const interfaces = os.networkInterfaces();
    for (const [ifaceName, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs ?? []) {
        if (addr.family !== "IPv4" || addr.internal) continue;
        const isTs = isTailscaleIpv4(addr.address) || ifaceName.toLowerCase().startsWith("tailscale");
        if (!isTs) {
          lanUrls.push(`http://${addr.address}:${port}/v1`);
        }
      }
    }

    // Comprehensive Tailscale detection across sockets, SPK/QPKG, interfaces, env vars, and passive request
    const tsInfo = await detectTailscale({
      port,
      incomingHost: hostHeaderStr,
    });

    const tailscaleUrl = tsInfo.apiUrl || (tsInfo.tailscaleUrl ? `${tsInfo.tailscaleUrl.replace(/\/$/, "")}/v1` : null);
    const tailscaleIpUrl = tsInfo.ip ? `http://${tsInfo.ip}:${port}/v1` : null;

    return reply.send({
      localUrl,
      lanUrls,
      tailscaleUrl,
      tailscaleIpUrl,
      port: Number(port) || 20128,
      tailscaleDetails: {
        connected: tsInfo.connected,
        ip: tsInfo.ip,
        magicDns: tsInfo.magicDns,
        hostname: tsInfo.hostname,
        source: tsInfo.source,
      },
    });
  });
}
