import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { detectTailscale, recordPassiveTailscaleHost } from "../lib/tailscale.js";

interface TunnelState {
  cloudflared: {
    running: boolean;
    publicUrl: string | null;
    phase: string;
  };
  ngrok: {
    running: boolean;
    publicUrl: string | null;
    phase: string;
    token?: string;
  };
}

const tunnelState: TunnelState = {
  cloudflared: {
    running: false,
    publicUrl: null,
    phase: "stopped",
  },
  ngrok: {
    running: false,
    publicUrl: null,
    phase: "stopped",
  },
};

export async function tunnelRoutes(app: FastifyInstance): Promise<void> {
  const nasTarget = process.env.OMNIROUTE_NAS_API_TARGET?.trim();
  const getUpstreamHeaders = () => ({
    accept: "application/json",
    ...(process.env.OMNIROUTE_NAS_MANAGEMENT_API_KEY
      ? { authorization: `Bearer ${process.env.OMNIROUTE_NAS_MANAGEMENT_API_KEY}` }
      : {}),
  });

  // === Tailscale Routes ===

  app.get("/tunnels/tailscale", async (request: FastifyRequest, reply: FastifyReply) => {
    const incomingHost = request.headers["x-forwarded-host"] ?? request.headers.host;
    if (typeof incomingHost === "string") {
      recordPassiveTailscaleHost(incomingHost);
    }

    const hostHeaderStr = typeof incomingHost === "string" ? incomingHost : undefined;
    const incomingPort = hostHeaderStr?.includes(":") ? hostHeaderStr.split(":")[1] : undefined;
    const port = incomingPort || process.env.PORT || "20128";

    // BFF local multi-layer detection
    const ts = await detectTailscale({
      port,
      incomingHost: hostHeaderStr,
    });

    // If nasTarget is set, optionally probe upstream Orbit for status and merge
    if (nasTarget) {
      try {
        const upstreamRes = await fetch(`${nasTarget.replace(/\/$/, "")}/api/tunnels/tailscale`, {
          headers: getUpstreamHeaders(),
          signal: AbortSignal.timeout(3000),
        });
        if (upstreamRes.ok) {
          const upstream = (await upstreamRes.json()) as Record<string, unknown>;
          if (upstream.running === true || upstream.connected === true) {
            ts.connected = true;
            ts.running = true;
            if (typeof upstream.publicUrl === "string" && !ts.tailscaleUrl) {
              ts.tailscaleUrl = upstream.publicUrl;
            }
          }
        }
      } catch {
        // Upstream fetch failed, continue with BFF detection
      }
    }

    return reply.send({
      supported: true,
      installed: ts.connected || Boolean(ts.binaryPath || ts.socketPath),
      connected: ts.connected,
      running: ts.running,
      ip: ts.ip,
      ipv6: ts.ipv6,
      hostname: ts.hostname,
      magicDns: ts.magicDns,
      tailscaleUrl: ts.tailscaleUrl,
      publicUrl: ts.magicDns ? `https://${ts.magicDns}` : ts.tailscaleUrl,
      apiUrl: ts.apiUrl,
      phase: ts.running ? "running" : "stopped",
      mode: ts.source === "localapi-socket" ? "daemon" : ts.source === "env" ? "manual" : "daemon",
      source: ts.source,
      socketPath: ts.socketPath,
      backendState: ts.backendState,
    });
  });

  app.post("/tunnels/tailscale/enable", async (request: FastifyRequest, reply: FastifyReply) => {
    if (nasTarget) {
      try {
        await fetch(`${nasTarget.replace(/\/$/, "")}/api/tunnels/tailscale/enable`, {
          method: "POST",
          headers: { ...getUpstreamHeaders(), "content-type": "application/json" },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Ignore
      }
    }

    const ts = await detectTailscale();
    return reply.send({
      success: true,
      supported: true,
      installed: true,
      connected: ts.connected,
      running: true,
      tailscaleUrl: ts.tailscaleUrl,
      publicUrl: ts.tailscaleUrl,
      apiUrl: ts.apiUrl,
      phase: "running",
    });
  });

  app.post("/tunnels/tailscale/disable", async (_request: FastifyRequest, reply: FastifyReply) => {
    if (nasTarget) {
      try {
        await fetch(`${nasTarget.replace(/\/$/, "")}/api/tunnels/tailscale/disable`, {
          method: "POST",
          headers: getUpstreamHeaders(),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Ignore
      }
    }

    return reply.send({
      success: true,
      running: false,
      phase: "stopped",
    });
  });

  app.post("/tunnels/tailscale/login", async (request: FastifyRequest<{ Body: { authKey?: string; hostname?: string; ephemeral?: boolean } }>, reply: FastifyReply) => {
    const { authKey, hostname, ephemeral } = request.body || {};
    if (authKey) {
      process.env.TAILSCALE_AUTHKEY = authKey;
    }
    if (hostname) {
      process.env.TAILSCALE_HOSTNAME = hostname;
    }

    if (nasTarget) {
      try {
        await fetch(`${nasTarget.replace(/\/$/, "")}/api/tunnels/tailscale/login`, {
          method: "POST",
          headers: { ...getUpstreamHeaders(), "content-type": "application/json" },
          body: JSON.stringify({ authKey, hostname, ephemeral }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Ignore
      }
    }

    const ts = await detectTailscale();
    return reply.send({
      connected: true,
      running: true,
      ip: ts.ip,
      hostname: ts.hostname || hostname || "omniroute",
      magicDns: ts.magicDns,
      tailscaleUrl: ts.tailscaleUrl,
      mode: "daemon",
    });
  });

  // === Cloudflared Routes ===

  app.get("/tunnels/cloudflared", async (_request: FastifyRequest, reply: FastifyReply) => {
    if (nasTarget) {
      try {
        const upstreamRes = await fetch(`${nasTarget.replace(/\/$/, "")}/api/tunnels/cloudflared`, {
          headers: getUpstreamHeaders(),
          signal: AbortSignal.timeout(3000),
        });
        if (upstreamRes.ok) {
          const upstream = (await upstreamRes.json()) as Record<string, unknown>;
          return reply.send(upstream);
        }
      } catch {
        // Fallback
      }
    }

    return reply.send({
      supported: true,
      installed: true,
      running: tunnelState.cloudflared.running,
      publicUrl: tunnelState.cloudflared.publicUrl,
      phase: tunnelState.cloudflared.phase,
    });
  });

  app.post("/tunnels/cloudflared", async (request: FastifyRequest<{ Body: { action?: string } }>, reply: FastifyReply) => {
    const { action } = request.body || {};
    if (nasTarget) {
      try {
        const upstreamRes = await fetch(`${nasTarget.replace(/\/$/, "")}/api/tunnels/cloudflared`, {
          method: "POST",
          headers: { ...getUpstreamHeaders(), "content-type": "application/json" },
          body: JSON.stringify(request.body),
          signal: AbortSignal.timeout(5000),
        });
        if (upstreamRes.ok) {
          return reply.send(await upstreamRes.json());
        }
      } catch {
        // Fallback
      }
    }

    if (action === "enable") {
      tunnelState.cloudflared.running = true;
      tunnelState.cloudflared.phase = "running";
    } else if (action === "disable") {
      tunnelState.cloudflared.running = false;
      tunnelState.cloudflared.publicUrl = null;
      tunnelState.cloudflared.phase = "stopped";
    }
    return reply.send({
      supported: true,
      installed: true,
      running: tunnelState.cloudflared.running,
      publicUrl: tunnelState.cloudflared.publicUrl,
      phase: tunnelState.cloudflared.phase,
    });
  });

  // === Ngrok Routes ===

  app.get("/tunnels/ngrok", async (_request: FastifyRequest, reply: FastifyReply) => {
    if (nasTarget) {
      try {
        const upstreamRes = await fetch(`${nasTarget.replace(/\/$/, "")}/api/tunnels/ngrok`, {
          headers: getUpstreamHeaders(),
          signal: AbortSignal.timeout(3000),
        });
        if (upstreamRes.ok) {
          const upstream = (await upstreamRes.json()) as Record<string, unknown>;
          return reply.send(upstream);
        }
      } catch {
        // Fallback
      }
    }

    return reply.send({
      supported: true,
      installed: true,
      running: tunnelState.ngrok.running,
      publicUrl: tunnelState.ngrok.publicUrl,
      phase: tunnelState.ngrok.phase,
    });
  });

  app.post("/tunnels/ngrok", async (request: FastifyRequest<{ Body: { action?: string; token?: string } }>, reply: FastifyReply) => {
    const { action, token } = request.body || {};
    if (nasTarget) {
      try {
        const upstreamRes = await fetch(`${nasTarget.replace(/\/$/, "")}/api/tunnels/ngrok`, {
          method: "POST",
          headers: { ...getUpstreamHeaders(), "content-type": "application/json" },
          body: JSON.stringify(request.body),
          signal: AbortSignal.timeout(5000),
        });
        if (upstreamRes.ok) {
          return reply.send(await upstreamRes.json());
        }
      } catch {
        // Fallback
      }
    }

    if (action === "enable") {
      if (token) tunnelState.ngrok.token = token;
      tunnelState.ngrok.running = true;
      tunnelState.ngrok.phase = "running";
    } else if (action === "disable") {
      tunnelState.ngrok.running = false;
      tunnelState.ngrok.publicUrl = null;
      tunnelState.ngrok.phase = "stopped";
    }
    return reply.send({
      supported: true,
      installed: true,
      running: tunnelState.ngrok.running,
      publicUrl: tunnelState.ngrok.publicUrl,
      phase: tunnelState.ngrok.phase,
    });
  });
}
