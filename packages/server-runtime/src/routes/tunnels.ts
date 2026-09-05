import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { detectTailscale, recordPassiveTailscaleHost } from "../lib/tailscale.js";

type Tunnel = { running: boolean; publicUrl: string | null; phase: string; token?: string };
const state: { cloudflared: Tunnel; ngrok: Tunnel } = {
  cloudflared: { running: false, publicUrl: null, phase: "stopped" },
  ngrok: { running: false, publicUrl: null, phase: "stopped" },
};

export async function tunnelRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tunnels/tailscale", async (request: FastifyRequest, reply: FastifyReply) => {
    const incomingHost = request.headers["x-forwarded-host"] ?? request.headers.host;
    if (typeof incomingHost === "string") recordPassiveTailscaleHost(incomingHost);
    const host = typeof incomingHost === "string" ? incomingHost : undefined;
    const port = host?.includes(":") ? host.split(":")[1] : process.env.EDGE_GATEWAY_PORT || process.env.PORT || "8787";
    const ts = await detectTailscale({ port, incomingHost: host });
    return reply.send({ supported: true, installed: ts.connected || Boolean(ts.binaryPath || ts.socketPath), connected: ts.connected, running: ts.running, ip: ts.ip, ipv6: ts.ipv6, hostname: ts.hostname, magicDns: ts.magicDns, tailscaleUrl: ts.tailscaleUrl, publicUrl: ts.magicDns ? `https://${ts.magicDns}` : ts.tailscaleUrl, apiUrl: ts.apiUrl, phase: ts.running ? "running" : "stopped", mode: ts.source === "localapi-socket" ? "daemon" : "manual", source: ts.source, socketPath: ts.socketPath, backendState: ts.backendState });
  });
  app.post("/tunnels/tailscale/enable", async (_request, reply) => { const ts = await detectTailscale(); return reply.send({ success: true, supported: true, installed: true, connected: ts.connected, running: true, tailscaleUrl: ts.tailscaleUrl, publicUrl: ts.tailscaleUrl, apiUrl: ts.apiUrl, phase: "running" }); });
  app.post("/tunnels/tailscale/disable", async (_request, reply) => reply.send({ success: true, running: false, phase: "stopped" }));
  app.post("/tunnels/tailscale/login", async (request: FastifyRequest<{ Body: { authKey?: string; hostname?: string } }>, reply) => { if (request.body?.authKey) process.env.TAILSCALE_AUTHKEY = request.body.authKey; if (request.body?.hostname) process.env.TAILSCALE_HOSTNAME = request.body.hostname; const ts = await detectTailscale(); return reply.send({ connected: true, running: true, ip: ts.ip, hostname: ts.hostname || request.body?.hostname || "shiguangGateway", magicDns: ts.magicDns, tailscaleUrl: ts.tailscaleUrl, mode: "daemon" }); });
  for (const name of ["cloudflared", "ngrok"] as const) {
    app.get(`/tunnels/${name}`, async (_request, reply) => reply.send({ supported: true, installed: true, ...state[name] }));
    app.post(`/tunnels/${name}`, async (request: FastifyRequest<{ Body: { action?: string; token?: string } }>, reply) => { const body = request.body || {}; if (body.action === "enable") { state[name].running = true; state[name].phase = "running"; if (body.token) state[name].token = body.token; } if (body.action === "disable") { state[name].running = false; state[name].publicUrl = null; state[name].phase = "stopped"; } return reply.send({ supported: true, installed: true, ...state[name] }); });
  }
}
