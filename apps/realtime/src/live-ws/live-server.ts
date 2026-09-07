/**
 * Live Dashboard WebSocket Server
 *
 * Separate process (runs alongside Next.js on port 20132).
 * Forwards EventBus events to subscribed dashboard clients.
 *
 * Protocol:
 *   Client → Server: { type: "subscribe", channels: ["requests", "combo"] }
 *   Server → Client: { type: "event", channel: "requests", event: "request.started", data: {...} }
 *   Client → Server: { type: "ping" }
 *   Server → Client: { type: "pong" }
 *   Server → Client: { type: "welcome", version, sessionId, channels, backlog }
 *   Server → Client: { type: "error", code, message }
 *
 * Liveness: besides the application ping/pong above, the server sends a protocol-level
 * ping (RFC 6455 §5.5.2) each HEARTBEAT_INTERVAL_MS. Conformant clients answer it with a
 * pong control frame automatically, so a quiet-but-alive subscriber survives.
 */

import { WebSocketServer, WebSocket } from "ws";
import { isAdminIdentity, isLocalDevMode, resolveGatewayIdentity } from "@orbit/auth";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { randomUUID } from "crypto";
import type { WsClientMessage, WsServerMessage, WsEventMessage, WsAuthResult } from "@orbit/contracts/realtime";
import {
  CHANNEL_EVENTS,
  getChannelForEvent,
  type DashboardEventName,
  type DashboardEventMap,
  type DashboardChannel,
} from "@orbit/contracts/realtime-events";

// ── Types ─────────────────────────────────────────────────────────────────

import { emit, on, onAny, getEventHistory, type HistoryEntry } from "@orbit/core/events/eventBus";
import { isInternalServiceRequest } from "@orbit/auth/internal-service";

import {
  attachRequestStreamGuards,
  installProcessCrashGuard,
} from "@orbit/core/shared/http-client-abort-guard";

import {
  buildAllowedOrigins,
  buildAllowedHosts,
  isOriginAllowed as isOriginAllowedPure,
} from "./live-server-allow-list.js";

// ── Config ────────────────────────────────────────────────────────────────

const DEFAULT_PORT = 20132;
// Loopback by default. Opt-in to LAN exposure via LIVE_WS_HOST=0.0.0.0 — the
// caller is then responsible for fronting it with a TLS terminator + origin
// allow-list. Mirrors the route guard "local-only by default" posture.
const DEFAULT_HOST = "127.0.0.1";
const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 35_000;
const MAX_CLIENTS = 500;
const MAX_EVENTS_PER_SECOND = 100;
const MAX_PENDING_MESSAGES_PER_CLIENT = 32;
const MAX_PENDING_MESSAGE_BYTES = 16_384;

const ALLOWED_ORIGINS = buildAllowedOrigins();
const ALLOWED_HOSTS = buildAllowedHosts();

/**
 * Whether the given Origin is acceptable for a WS upgrade.
 *
 * Delegates to `live-server-allow-list` for the actual policy; this wrapper
 * exists so the connection handler can read the closure-bound allow-lists
 * without re-parsing env on every connection.
 */
function isOriginAllowed(origin: string | undefined): boolean {
  return isOriginAllowedPure(origin, process.env, {
    allowedOrigins: ALLOWED_ORIGINS,
    allowedHosts: ALLOWED_HOSTS,
  });
}

// ── Client State ──────────────────────────────────────────────────────────

interface ClientState {
  ws: WebSocket;
  sessionId: string;
  subscribedChannels: Set<DashboardChannel>;
  lastActivity: number;
  /** Per-second rate limit counter */
  eventCounter: number;
  eventCounterReset: number;
  /** Current IP for rate limiting */
  remoteAddress: string;
}

const clients = new Map<string, ClientState>();
let eventHistoryBacklog: HistoryEntry[] = [];
const BACKLOG_MAX = 500;

// ── Auth ──────────────────────────────────────────────────────────────────

function toWebHeaders(headers: import("http").IncomingMessage["headers"]): Headers {
  const webHeaders = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      webHeaders.set(name, value);
    } else if (Array.isArray(value)) {
      webHeaders.set(name, name.toLowerCase() === "cookie" ? value.join("; ") : value.join(", "));
    }
  }

  return webHeaders;
}

// Auth-module warmer. The SSE auth graph is large (hundreds of transitive
// modules); a cold dynamic import takes several seconds and runs synchronously
// enough to stall the single-threaded event loop. Loading it lazily inside the
// connection handler meant the FIRST API-key WebSocket connection blocked the
// loop long enough that any connection arriving in that window (e.g. a
// same-origin cookie client) could not complete its handshake and timed out.
// Memoize the import and warm it once during startup (before listen) so
// connection handling never pays that cost. Kept as a dynamic import (not a
// top-level static one) to preserve the sidecar's decoupling from the SSE auth
// graph at module-load time.
let authModulePromise: Promise<typeof import("@orbit/inference/services/auth")> | null = null;
function loadAuthModule(): Promise<typeof import("@orbit/inference/services/auth")> {
  if (!authModulePromise) {
    authModulePromise = import("@orbit/inference/services/auth");
  }
  return authModulePromise;
}

async function authorizeConnection(request: import("http").IncomingMessage): Promise<WsAuthResult> {
  const sessionId = randomUUID().slice(0, 8);

  // The same-origin proxy supplies a signed SSO assertion for browser clients.
  // A presented assertion must pass the shared issuer/audience/entitlement
  // checks; never downgrade a rejected assertion to cookie or API-key auth.
  if (request.headers["x-sg-identity"] !== undefined) {
    try {
      const identity = await resolveGatewayIdentity(request);
      return isAdminIdentity(identity)
        ? { authorized: true, sessionId }
        : { authorized: false, sessionId, error: "Invalid gateway identity" };
    } catch {
      return { authorized: false, sessionId, error: "Gateway identity verification unavailable" };
    }
  }

  // Token MUST come from the Authorization header (or X-Live-WS-Token).
  // Query-string tokens leak into access logs, browser history, and Referer
  // headers — a single screenshot of the URL bar exposes the API key.
  const token = extractBearerToken(request) || extractAltTokenHeader(request);

  if (!token) {
    if (isLocalDevMode()) {
      return { authorized: true, sessionId };
    }
    return { authorized: false, sessionId, error: "Missing token" };
  }

  try {
    // Validate API key via the existing auth system (warmed at startup).
    const { extractApiKey, isValidApiKey } = await loadAuthModule();
    const apiKey = extractApiKey({ headers: { authorization: `Bearer ${token}` } } as any, {
      allowUrl: false,
    });

    if (!apiKey || !(await isValidApiKey(apiKey))) {
      return { authorized: false, sessionId, error: "Invalid API key" };
    }

    return { authorized: true, sessionId };
  } catch {
    return { authorized: false, sessionId, error: "Auth system unavailable" };
  }
}

function extractAltTokenHeader(request: import("http").IncomingMessage): string | null {
  const raw = request.headers["x-live-ws-token"];
  if (Array.isArray(raw)) return raw[0] || null;
  return typeof raw === "string" ? raw : null;
}

function extractBearerToken(request: import("http").IncomingMessage): string | null {
  const auth = request.headers["authorization"];
  if (!auth || typeof auth !== "string") return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

// ── Protocol Handler ──────────────────────────────────────────────────────

function handleMessage(clientId: string, raw: string): void {
  const client = clients.get(clientId);
  if (!client) return;

  // Rate limiting
  const now = Date.now();
  if (now - client.eventCounterReset > 1000) {
    client.eventCounter = 0;
    client.eventCounterReset = now;
  }
  client.eventCounter++;
  if (client.eventCounter > MAX_EVENTS_PER_SECOND) {
    sendTo(client.ws, { type: "error", code: "RATE_LIMITED", message: "Too many messages" });
    return;
  }

  let msg: WsClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    sendTo(client.ws, { type: "error", code: "PARSE_ERROR", message: "Invalid JSON" });
    return;
  }

  client.lastActivity = now;

  switch (msg.type) {
    case "subscribe": {
      client.subscribedChannels = new Set(msg.channels);

      // Send buffered events that match subscribed channels
      const relevantHistory = eventHistoryBacklog.filter((h) => {
        const ch = getChannelForEvent(h.event as DashboardEventName);
        return ch && msg.channels.includes(ch);
      });

      sendTo(client.ws, {
        type: "welcome",
        version: "1.0.0",
        sessionId: client.sessionId,
        serverTime: now,
        channels: msg.channels,
        backlog: relevantHistory.length,
        data: relevantHistory.map((h) => ({
          event: h.event,
          channel: getChannelForEvent(h.event as DashboardEventName),
          data: h.payload,
          timestamp: h.timestamp,
        })),
      } as any);
      break;
    }

    case "ping":
      sendTo(client.ws, { type: "pong" } as WsServerMessage);
      break;
  }
}

// ── Send ──────────────────────────────────────────────────────────────────

function sendTo(ws: WebSocket, msg: WsServerMessage | Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ── Event Bus → WebSocket Bridge ──────────────────────────────────────────

function publishDashboardEvent(
  event: DashboardEventName,
  payload: unknown,
  timestamp = Date.now()
): boolean {
  const channel = getChannelForEvent(event);
  if (!channel) return false;

  // Store in backlog so clients that subscribe just after a run still receive it.
  eventHistoryBacklog.push({ event, payload, timestamp });
  if (eventHistoryBacklog.length > BACKLOG_MAX) {
    eventHistoryBacklog.shift();
  }

  const msg: WsEventMessage = {
    type: "event",
    channel,
    event,
    data: payload,
  };

  for (const [clientId, client] of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) {
      clients.delete(clientId);
      continue;
    }
    if (client.subscribedChannels.has(channel)) {
      sendTo(client.ws, msg);
    }
  }

  return true;
}

function subscribeToEventBus(): () => void {
  return onAny((event: string, payload: unknown) => {
    publishDashboardEvent(event as DashboardEventName, payload);
  });
}

function handleInternalEventRequest(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== "POST" || req.url !== "/__orbit_event") {
    res.writeHead(404).end();
    return;
  }
  const internalRequest = new Request("http://realtime/__orbit_event", { headers: toWebHeaders(req.headers) });
  if (!isInternalServiceRequest(internalRequest)) {
    res.writeHead(403, { "content-type": "application/json" }).end(JSON.stringify({ ok: false }));
    return;
  }

  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      req.destroy(new Error("Internal event payload too large"));
    }
  });
  req.on("error", () => {
    if (!res.headersSent) res.writeHead(400).end();
  });
  req.on("end", () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const event = parsed.event as DashboardEventName;
      if (!Object.values(CHANNEL_EVENTS).some((events) => events.includes(event))) {
        res
          .writeHead(400, { "content-type": "application/json" })
          .end(JSON.stringify({ ok: false }));
        return;
      }
      const ok = publishDashboardEvent(
        event,
        parsed.payload,
        Number(parsed.timestamp) || Date.now()
      );
      res
        .writeHead(ok ? 202 : 400, { "content-type": "application/json" })
        .end(JSON.stringify({ ok }));
    } catch {
      res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ ok: false }));
    }
  });
}

async function seedLatestCompressionRunFromDb(): Promise<void> {
  try {
    const { getLatestCompressionAnalyticsRun } = await import("@orbit/core/db/compression-analytics");
    const row = getLatestCompressionAnalyticsRun();
    if (!row) return;

    const originalTokens = Number(row.original_tokens) || 0;
    const compressedTokens = Number(row.compressed_tokens) || 0;
    const savingsPercent =
      originalTokens > 0
        ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
        : 0;
    const timestamp = Number.isFinite(Date.parse(row.timestamp))
      ? Date.parse(row.timestamp)
      : Date.now();

    publishDashboardEvent(
      "compression.completed",
      {
        requestId: row.request_id || `analytics-${row.id}`,
        comboId: row.compression_combo_id || row.combo_id || null,
        mode: row.mode,
        originalTokens,
        compressedTokens,
        savingsPercent,
        engineBreakdown: [
          {
            engine: row.engine || row.mode || "compression",
            originalTokens,
            compressedTokens,
            savingsPercent,
            techniquesUsed: [],
            rulesApplied: [],
            durationMs: row.duration_ms ?? undefined,
          },
        ],
        validationWarnings: [],
        fallbackApplied: Boolean(row.validation_fallback),
        timestamp,
      },
      timestamp
    );
    console.log(
      "[LiveWS] Seeded latest compression run from analytics: %s",
      row.request_id || row.id
    );
  } catch (err) {
    console.warn(
      "[LiveWS] Could not seed compression analytics backlog: %s",
      err instanceof Error ? err.message : String(err)
    );
  }
}

// ── Heartbeat ─────────────────────────────────────────────────────────────

function startHeartbeat(server: WebSocketServer): void {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [clientId, client] of clients) {
      if (client.ws.readyState !== WebSocket.OPEN) {
        clients.delete(clientId);
        continue;
      }
      // Check heartbeat timeout
      if (now - client.lastActivity > HEARTBEAT_TIMEOUT_MS) {
        client.ws.terminate();
        clients.delete(clientId);
        continue;
      }
      // Send the application-level heartbeat response for clients that still rely on it.
      sendTo(client.ws, { type: "pong" } as WsServerMessage);
      // Protocol-level ping: the client's automatic pong reply is what keeps a
      // silent-but-alive subscriber alive, while a half-open socket stays silent and is
      // still reaped. Nothing here refreshes lastActivity — only a received pong does,
      // so #10452 holds.
      client.ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
  // Don't keep the process alive solely for the heartbeat (it is also cleared on close).
  (interval as { unref?: () => void })?.unref?.();

  server.on("close", () => clearInterval(interval));
}

// ── Server Start ──────────────────────────────────────────────────────────

/**
 * Start the live dashboard WebSocket server.
 *
 * Bound to 127.0.0.1 by default. Set LIVE_WS_HOST=0.0.0.0 to expose on the
 * LAN — the caller is then responsible for fronting it with TLS + an Origin
 * allow-list via LIVE_WS_ALLOWED_ORIGINS.
 */
export async function startLiveDashboardServer(
  port = DEFAULT_PORT,
  host = DEFAULT_HOST
): Promise<LiveDashboardServer> {
  // Safety net: a client aborting a connection can emit `Error: aborted`/
  // ECONNRESET on the request stream; without this the single missed listener
  // becomes an uncaughtException that kills the server. Benign aborts are
  // swallowed; genuine errors still crash loudly (#fix-dev-server-aborted).
  installProcessCrashGuard();


  const server = createServer((req, res) => {
    // Absorb client-abort errors (browser closes the socket during navigation/
    // HMR/bfcache) on the request/response streams so they never surface as an
    // uncaughtException that kills the server (#fix-dev-server-aborted).
    attachRequestStreamGuards(req, res);
    handleInternalEventRequest(req, res);
  });
  const wss = new WebSocketServer({ server });

  // Subscribe to EventBus
  const unsubscribeFromEventBus = subscribeToEventBus();
  let eventBusSubscribed = true;
  const unsubscribe = () => {
    if (!eventBusSubscribed) return;
    eventBusSubscribed = false;
    unsubscribeFromEventBus();
  };
  await seedLatestCompressionRunFromDb();

  // Warm the auth module before accepting clients so the first API-key connection
  // does not block the event loop on a cold import — which would starve concurrent
  // WebSocket handshakes (see loadAuthModule). A failed warm is non-fatal: the
  // handler retries the import lazily.
  await loadAuthModule().catch(() => {});

  wss.on("connection", async (ws, request) => {
    const pendingMessages: string[] = [];
    let activeClientId: string | null = null;

    // Clients can send the subscribe frame immediately after the WS open event,
    // while dashboard SSO/API-key auth is still resolving. Queue those early
    // messages so the first subscribe is not dropped.
    ws.on("message", (data) => {
      const raw = data.toString();
      if (!activeClientId) {
        if (
          pendingMessages.length >= MAX_PENDING_MESSAGES_PER_CLIENT ||
          raw.length > MAX_PENDING_MESSAGE_BYTES
        ) {
          sendTo(ws, { type: "error", code: "RATE_LIMITED", message: "Too many early messages" });
          ws.close(4008, "Too many early messages");
          return;
        }
        pendingMessages.push(raw);
        return;
      }
      handleMessage(activeClientId, raw);
    });

    // Origin check — browsers always send Origin on the WS upgrade; reject
    // unknown origins to stop drive-by cross-origin WebSocket from a victim
    // page. Non-browser clients (CLI / MCP) omit Origin and are accepted
    // only when bound to loopback (see isOriginAllowed).
    const origin = request.headers["origin"];
    const originStr = Array.isArray(origin) ? origin[0] : origin;
    if (!isOriginAllowed(originStr)) {
      sendTo(ws, { type: "error", code: "FORBIDDEN_ORIGIN", message: "Origin not allowed" });
      ws.close(4003, "Forbidden origin");
      return;
    }

    // Enforce max clients
    if (clients.size >= MAX_CLIENTS) {
      sendTo(ws, { type: "error", code: "SERVER_FULL", message: "Max clients reached" });
      ws.close(1013, "Server full");
      return;
    }

    // Authorize
    const auth = await authorizeConnection(request);
    if (!auth.authorized) {
      sendTo(ws, { type: "error", code: "UNAUTHORIZED", message: auth.error || "Unauthorized" });
      ws.close(4001, "Unauthorized");
      return;
    }

    const clientId = auth.sessionId;
    activeClientId = clientId;
    const client: ClientState = {
      ws,
      sessionId: clientId,
      subscribedChannels: new Set(),
      lastActivity: Date.now(),
      eventCounter: 0,
      eventCounterReset: Date.now(),
      remoteAddress: request.socket?.remoteAddress || "unknown",
    };

    clients.set(clientId, client);

    // Constant format string + %s args — keeps clientId / remoteAddress out
    // of the format slot so a malicious value cannot forge log lines via
    // injected format specifiers (CWE-134).
    console.log(
      "[LiveWS] Client connected: %s (%s) [%d total]",
      clientId,
      client.remoteAddress,
      clients.size
    );

    // Replay any subscribe/ping frames sent while auth was still pending.
    for (const raw of pendingMessages.splice(0)) {
      handleMessage(clientId, raw);
    }

    // Handle close
    ws.on("close", () => {
      clients.delete(clientId);
      console.log("[LiveWS] Client disconnected: %s [%d remaining]", clientId, clients.size);
    });

    // Handle errors
    ws.on("error", (err) => {
      console.error("[LiveWS] Client error %s: %s", clientId, err.message);
      clients.delete(clientId);
    });

    // A control-frame pong (RFC 6455 §5.5.3) from the client is the only signal that
    // proves the socket is not half-open (see startHeartbeat).
    ws.on("pong", () => {
      const current = clients.get(clientId);
      if (current) current.lastActivity = Date.now();
    });
  });

  // Heartbeat
  startHeartbeat(wss);

  // Cleanup on close
  wss.on("close", () => {
    unsubscribe();
    clients.clear();
  });

  await new Promise<void>((resolve, reject) => {
    // Reject on bind failure (e.g. EADDRINUSE when the API bridge already holds
    // 20129) instead of crashing the process — the crash-loop of issue #6324.
    // The listener MUST be on `wss`, not `server`: ws re-emits the server's
    // "error" via wss.emit(), which throws synchronously when wss has no
    // listener — before any `server.on("error")` handler could run. The server
    // never opened, so wss.on("close") won't fire; release the EventBus
    // subscription here so a failed start leaks nothing.
    wss.once("error", (err: NodeJS.ErrnoException) => {
      unsubscribe();
      clients.clear();
      reject(err);
    });
    server.listen(port, host, () => {
      console.log("[LiveWS] Dashboard WebSocket server listening on %s:%d", host, port);
      resolve();
    });
  });

  let closing: Promise<void> | null = null;
  return {
    server,
    close() {
      if (closing) return closing;
      closing = (async () => {
        // Upgraded sockets are not closed by http.Server.close(). Terminate
        // them first so shutdown cannot wait indefinitely for a dashboard
        // client, then close the WebSocket and HTTP listeners in that order.
        for (const socket of wss.clients) socket.terminate();
        await new Promise<void>((resolve, reject) => {
          wss.close((error) => error ? reject(error) : resolve());
        });
        unsubscribe();
        clients.clear();
        if (!server.listening) return;
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      })();
      return closing;
    },
  };
}

export interface LiveDashboardServer {
  server: import("http").Server;
  close(): Promise<void>;
}

// The Nest `LiveModule` owns startup/shutdown through `LiveServerService`.
// Keep this module side-effect free: importing transport code must never bind a
// port, subscribe to the event bus, or start background timers.
export function isLiveWsEnabled(): boolean {
  const v = process.env.ORBIT_ENABLE_LIVE_WS;
  if (v === undefined) return true; // default ON (loopback-bound)
  return v === "1" || v.toLowerCase() === "true";
}
