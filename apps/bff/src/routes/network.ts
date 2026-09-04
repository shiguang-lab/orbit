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

    // Comprehensive Tailscale detection on BFF (Socket, LocalAPI, interfaces, env vars, passive request)
    const tsInfo = await detectTailscale({
      port,
      incomingHost: hostHeaderStr,
    });

    // Upstream Orbit Client Processing (when BFF runs in proxy/NAS adapter mode)
    const nasTarget = process.env.OMNIROUTE_NAS_API_TARGET?.trim();
    if (nasTarget) {
      try {
        const upstreamRes = await fetch(`${nasTarget.replace(/\/$/, "")}/api/network/info`, {
          headers: {
            accept: "application/json",
            ...(process.env.OMNIROUTE_NAS_MANAGEMENT_API_KEY
              ? { authorization: `Bearer ${process.env.OMNIROUTE_NAS_MANAGEMENT_API_KEY}` }
              : {}),
          },
          signal: AbortSignal.timeout(3000),
        });
        if (upstreamRes.ok) {
          const upstreamData = (await upstreamRes.json()) as {
            localUrl?: string;
            lanUrls?: string[];
            tailscaleUrl?: string | null;
            tailscaleIpUrl?: string | null;
          };
          if (Array.isArray(upstreamData.lanUrls)) {
            for (const url of upstreamData.lanUrls) {
              if (url && !lanUrls.includes(url)) lanUrls.push(url);
            }
          }
          if (upstreamData.tailscaleUrl && !tsInfo.tailscaleUrl) {
            tsInfo.tailscaleUrl = upstreamData.tailscaleUrl;
            tsInfo.connected = true;
            tsInfo.running = true;
          }
          if (upstreamData.tailscaleIpUrl && !tsInfo.ip) {
            tsInfo.ip = upstreamData.tailscaleIpUrl.replace(/^https?:\/\//, "").split(":")[0];
            tsInfo.connected = true;
            tsInfo.running = true;
          }
        }
      } catch {
        // Upstream fetch timeout or offline, continue with BFF local detection
      }

      try {
        const nasUrl = new URL(nasTarget);
        if (isTailscaleIpv4(nasUrl.hostname) || nasUrl.hostname.endsWith(".ts.net") || nasUrl.hostname.endsWith(".tailscale.net")) {
          // nasTarget is already Tailscale
        } else if (nasUrl.hostname !== "localhost" && nasUrl.hostname !== "127.0.0.1") {
          const nasLanUrl = `${nasTarget.replace(/\/$/, "")}/v1`;
          if (!lanUrls.includes(nasLanUrl)) lanUrls.push(nasLanUrl);
        }
      } catch {
        // Ignore malformed nasTarget URL
      }
    }

    // Local host interfaces
    const interfaces = os.networkInterfaces();
    for (const [ifaceName, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs ?? []) {
        if (addr.family !== "IPv4" || addr.internal) continue;
        const isTs = isTailscaleIpv4(addr.address) || ifaceName.toLowerCase().startsWith("tailscale");
        if (!isTs) {
          const formatted = `http://${addr.address}:${port}/v1`;
          if (!lanUrls.includes(formatted)) {
            lanUrls.push(formatted);
          }
        }
      }
    }

    let tailscaleUrl = tsInfo.apiUrl || (tsInfo.tailscaleUrl ? `${tsInfo.tailscaleUrl.replace(/\/$/, "")}/v1` : null);
    let tailscaleIpUrl = tsInfo.ip ? `http://${tsInfo.ip}:${port}/v1` : null;

    if (!tailscaleUrl && nasTarget) {
      try {
        const nasUrl = new URL(nasTarget);
        if (isTailscaleIpv4(nasUrl.hostname) || nasUrl.hostname.endsWith(".ts.net") || nasUrl.hostname.endsWith(".tailscale.net")) {
          tailscaleUrl = `${nasTarget.replace(/\/$/, "")}/v1`;
          if (isTailscaleIpv4(nasUrl.hostname)) {
            tailscaleIpUrl = `${nasTarget.replace(/\/$/, "")}/v1`;
          }
        }
      } catch {
        // Ignore
      }
    }

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
