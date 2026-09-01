/**
 * 实时 WebSocket client：移植自 OmniRoute Orbit src/hooks/useLiveDashboard.ts 的核心逻辑。
 *
 * 链路：GET /api/v1/ws?handshake=1 发现 live.publicUrl/path/port → new WebSocket →
 * 发 {type:"subscribe", channels} → 收 {type:"event", channel, event, data} / {type:"welcome", data:backlog} →
 * 15s ping 心跳 + 指数退避重连。
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type LiveChannel = "requests" | "combo" | "credentials" | "compression";

export interface LiveEvent {
  channel: string;
  event: string;
  data: unknown;
  timestamp?: number;
}

interface WsHandshakeInfo {
  publicUrl?: string;
  port?: number;
  path?: string;
  protocol?: string;
  channels?: string[];
  auth?: string;
  heartbeatMs?: number;
}

interface WsHandshakeResponse {
  live?: WsHandshakeInfo;
  error?: { code?: string; message?: string };
}

export interface LiveDashboardOptions {
  channels?: LiveChannel[];
  apiKey?: string;
  wsUrl?: string;
  enabled?: boolean;
}

export type LiveConnectionStatus = "connecting" | "open" | "closed" | "error";

const RETRY_BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_INTERVAL = 15_000;

async function discoverLiveWs(): Promise<WsHandshakeInfo | null> {
  try {
    const response = await fetch("/api/v1/ws?handshake=1", { credentials: "same-origin" });
    if (!response.ok) return null;
    const body = (await response.json()) as WsHandshakeResponse;
    return body.live ?? null;
  } catch {
    return null;
  }
}

function buildWsUrl(info: WsHandshakeInfo | null, apiKey?: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // 优先 handshake 返回的公网 URL；否则默认 host + 端口/路径
  if (info?.publicUrl) {
    const base = info.publicUrl.replace(/^wss?:\/\//, "");
    const path = info.path && !info.publicUrl.endsWith(info.path) ? info.path : "";
    const url = `${protocol}//${base}${path || ""}`;
    return apiKey ? `${url}?token=${encodeURIComponent(apiKey)}` : url;
  }
  const host = window.location.hostname;
  const port = info?.port ?? 20132;
  const path = info?.path ?? "/live-ws";
  const url = `${protocol}//${host}:${port}${path}`;
  return apiKey ? `${url}?token=${encodeURIComponent(apiKey)}` : url;
}

export function useLiveDashboard({
  channels = ["requests", "combo", "credentials"],
  apiKey,
  wsUrl,
  enabled = true,
}: LiveDashboardOptions = {}) {
  const [status, setStatus] = useState<LiveConnectionStatus>("closed");
  const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const enabledRef = useRef(enabled);
  const channelsRef = useRef(channels);
  const apiKeyRef = useRef(apiKey);
  const wsUrlRef = useRef(wsUrl);
  const listenersRef = useRef<Set<(event: LiveEvent) => void>>(new Set());

  enabledRef.current = enabled;
  channelsRef.current = channels;
  apiKeyRef.current = apiKey;
  wsUrlRef.current = wsUrl;

  const onEvent = useCallback((event: LiveEvent) => {
    setLastEvent(event);
    listenersRef.current.forEach((fn) => fn(event));
  }, []);

  const subscribe = useCallback((fn: (event: LiveEvent) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!enabledRef.current) return;
    // 已在连接中则跳过
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    let info: WsHandshakeInfo | null = null;
    if (!wsUrlRef.current) {
      info = await discoverLiveWs();
    }
    const url = wsUrlRef.current ?? buildWsUrl(info, apiKeyRef.current);
    setStatus("connecting");

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setStatus("open");
      ws.send(JSON.stringify({ type: "subscribe", channels: channelsRef.current }));
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(String(msg.data)) as
          | { type: "event"; channel: string; event: string; data: unknown; timestamp?: number }
          | { type: "welcome"; data?: unknown[] }
          | { type: "pong" }
          | { type: "error"; code?: string; message?: string };
        if (parsed.type === "event") {
          onEvent({ channel: parsed.channel, event: parsed.event, data: parsed.data, timestamp: parsed.timestamp });
        } else if (parsed.type === "welcome" && Array.isArray(parsed.data)) {
          for (const item of parsed.data) {
            if (!item || typeof item !== "object") continue;
            const backlog = item as { channel?: string; event?: string; data?: unknown; timestamp?: number };
            if (typeof backlog.channel === "string" && typeof backlog.event === "string") {
              onEvent({ channel: backlog.channel, event: backlog.event, data: backlog.data, timestamp: backlog.timestamp });
            }
          }
        }
      } catch {
        // 忽略非 JSON 消息
      }
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      setStatus("closed");
      wsRef.current = null;
      if (!enabledRef.current) return;
      const delay = RETRY_BACKOFF[Math.min(attemptRef.current, RETRY_BACKOFF.length - 1)];
      attemptRef.current += 1;
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [onEvent]);

  useEffect(() => {
    if (enabled) void connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, connect]);

  return { status, lastEvent, subscribe };
}

export interface LiveRequest {
  id: string;
  model: string;
  provider: string;
  timestamp: number;
  status: "pending" | "running" | "success" | "error";
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs?: number;
  error?: string;
}

/** 派生 hook：实时请求流（首页拓扑/最近请求）。保持 active 请求集合与官方一致。 */
export function useLiveRequests(options: LiveDashboardOptions = {}) {
  const { status, subscribe } = useLiveDashboard({ ...options, channels: ["requests"] });
  const [requestState, setRequestState] = useState<{ active: Map<string, LiveRequest>; completed: LiveRequest[] }>({ active: new Map(), completed: [] });

  useEffect(() => {
    return subscribe((event) => {
      if (event.channel !== "requests" || !event.data || typeof event.data !== "object") return;
      const data = event.data as Record<string, unknown>;
      const id = typeof data.id === "string" ? data.id : "";
      if (!id) return;
      if (event.event === "request.started") {
        setRequestState((previous) => {
          const active = new Map(previous.active);
          active.set(id, {
            id,
            model: typeof data.model === "string" ? data.model : "",
            provider: typeof data.provider === "string" ? data.provider : "",
            timestamp: typeof data.timestamp === "number" ? data.timestamp : event.timestamp ?? Date.now(),
            status: "pending",
          });
          return { active, completed: previous.completed };
        });
      } else if (event.event === "request.streaming") {
        setRequestState((previous) => {
          const current = previous.active.get(id);
          if (!current) return previous;
          const active = new Map(previous.active);
          active.set(id, { ...current, status: "running" });
          return { active, completed: previous.completed };
        });
      } else if (event.event === "request.completed" || event.event === "request.failed") {
        setRequestState((previous) => {
          const current = previous.active.get(id);
          if (!current) return previous;
          const active = new Map(previous.active);
          active.delete(id);
          const completed: LiveRequest = {
            ...current,
            status: event.event === "request.failed" || data.status !== "success" ? "error" : "success",
            tokensInput: typeof data.tokensInput === "number" ? data.tokensInput : undefined,
            tokensOutput: typeof data.tokensOutput === "number" ? data.tokensOutput : undefined,
            latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : undefined,
            error: typeof data.error === "string" ? data.error : undefined,
          };
          return { active, completed: [completed, ...previous.completed].slice(0, 100) };
        });
      }
    });
  }, [subscribe]);

  useEffect(() => {
    if (options.enabled === false) setRequestState({ active: new Map(), completed: [] });
  }, [options.enabled]);

  return { status, activeRequests: Array.from(requestState.active.values()), completedRequests: requestState.completed, activeCount: requestState.active.size };
}

/** 派生 hook：实时 combo 路由级联 */
export function useLiveComboStatus() {
  const { status, subscribe } = useLiveDashboard({ channels: ["combo", "credentials"] });
  const [combos, setCombos] = useState<unknown[]>([]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.channel === "combo") {
        setCombos((prev) => [event.data, ...prev].slice(0, 50));
      }
    });
  }, [subscribe]);

  return { status, combos };
}
