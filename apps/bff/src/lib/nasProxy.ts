import type { FastifyReply, FastifyRequest } from "fastify";
import type { LocalAuthBroker } from "./broker.js";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  // Never let NAS set cookies on the local admin origin.
  "set-cookie",
]);

export interface NasProxyOptions {
  target: string;
  managementApiKey?: string;
  broker?: LocalAuthBroker;
  forwardSessionCookie?: boolean;
}

const DEFAULT_NAS_TIMEOUT_MS = 30_000;
const LONG_OPERATION_TIMEOUT_MS = 300_000;

export function resolveNasProxyTimeoutMs(
  pathname: string,
  configuredTimeout = process.env.OMNIROUTE_NAS_API_TIMEOUT_MS,
): number {
  const parsed = Number(configuredTimeout ?? DEFAULT_NAS_TIMEOUT_MS);
  const baseTimeout = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_NAS_TIMEOUT_MS;
  const isLongOperation =
    /^\/api\/services\/[^/]+\/(install|update)\/?$/.test(pathname) ||
    pathname === "/api/version-manager/install";
  return isLongOperation ? Math.max(baseTimeout, LONG_OPERATION_TIMEOUT_MS) : baseTimeout;
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("name" in error)) return false;
  const name = (error as { name?: unknown }).name;
  return name === "TimeoutError" || name === "AbortError";
}

/** Paths owned by the local BFF and never forwarded to NAS. */
export function isLocalBffPath(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname === "/api/healthz" ||
    pathname === "/api/livez" ||
    pathname === "/api/readyz" ||
    // Provider metadata is the static Orbit catalog. Keep this endpoint local
    // so a NAS deployment with an older API cannot turn it into a 404.
    pathname === "/api/providers/catalog" ||
    /^\/api\/providers\/[^/]+\/catalog-models$/.test(pathname)
  );
}

export function isNativeAuthPath(pathname: string): boolean {
  return pathname.startsWith("/api/auth/") || pathname === "/api/settings/require-login";
}

export async function checkNasSession(
  request: FastifyRequest,
  target: string,
  managementApiKey?: string,
): Promise<boolean> {
  const cookie = request.headers.cookie;
  if (!cookie) return false;
  const headers = new Headers({ cookie, accept: "application/json" });
  if (managementApiKey?.trim()) headers.set("authorization", `Bearer ${managementApiKey.trim()}`);
  try {
    const response = await fetch(`${target.replace(/\/$/, "")}/api/auth/status`, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { authenticated?: boolean };
    return body.authenticated === true;
  } catch {
    return false;
  }
}

/**
 * Forward a dashboard API request to the NAS-hosted Orbit instance.
 * Authentication is server-side: prefer the short-lived SSO identity issued
 * by the optional local broker, otherwise use a management-scoped API key
 * configured on the BFF. The native Orbit session cookie is forwarded only for
 * official auth routes; arbitrary client authorization headers are not forwarded.
 */
export async function proxyToNas(
  request: FastifyRequest,
  reply: FastifyReply,
  options: NasProxyOptions,
): Promise<void> {
  const identity = options.broker ? await options.broker.identity() : null;
  const apiKey = options.managementApiKey?.trim();
  if (!identity && !apiKey) {
    reply.status(503).send({
      error: {
        type: "upstream_auth_not_configured",
        message:
          "NAS API authentication is not configured. Set OMNIROUTE_NAS_MANAGEMENT_API_KEY or enable the local SSO broker.",
      },
      requestId: request.id,
    });
    return;
  }

  const incomingUrl = new URL(request.url, "http://bff");
  const requestPath = incomingUrl.pathname;
  // The official Orbit API calls this endpoint /api/auth/status. Keep the
  // migrated Web contract (/api/auth/session) stable at the gateway edge.
  const upstreamPath = requestPath === "/api/auth/session" ? "/api/auth/status" : requestPath;
  const target = `${options.target.replace(/\/$/, "")}${upstreamPath}${incomingUrl.search}`;
  const timeoutMs = resolveNasProxyTimeoutMs(requestPath);
  const headers = new Headers();
  const contentType = request.headers["content-type"];
  if (typeof contentType === "string") headers.set("content-type", contentType);
  const accept = request.headers.accept;
  if (typeof accept === "string") headers.set("accept", accept);
  const csrf = request.headers["x-omniroute-csrf"];
  if (typeof csrf === "string") headers.set("x-omniroute-csrf", csrf);
  if (options.forwardSessionCookie) {
    const cookie = request.headers.cookie;
    if (typeof cookie === "string" && cookie) headers.set("cookie", cookie);
    const forwardedHost = request.headers["x-forwarded-host"] ?? request.headers.host;
    if (typeof forwardedHost === "string" && forwardedHost) {
      headers.set("x-forwarded-host", forwardedHost);
      // Orbit's native OIDC handlers use Host when constructing callback URLs.
      // Preserve the public gateway host instead of the private NAS address.
      headers.set("host", forwardedHost);
    }
    const forwardedProto = request.headers["x-forwarded-proto"];
    if (typeof forwardedProto === "string" && forwardedProto) headers.set("x-forwarded-proto", forwardedProto);
    else if (request.protocol) headers.set("x-forwarded-proto", request.protocol);
  }
  if (identity) headers.set("x-sg-identity", identity);
  if (!identity && apiKey) headers.set("authorization", `Bearer ${apiKey}`);

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : serializeBody(request.body);
  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = isTimeoutError(error);
    reply.status(timedOut ? 504 : 502).send({
      error: {
        type: timedOut ? "upstream_timeout" : "upstream_unavailable",
        message: timedOut
          ? `NAS API request timed out after ${timeoutMs}ms`
          : "NAS API is unavailable",
      },
      requestId: request.id,
    });
    request.log.warn({ err: error }, "NAS API request failed");
    return;
  }

  reply.status(response.status);
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) reply.header(key, value);
  });
  if (options.forwardSessionCookie) {
    const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const cookies = getSetCookie ? getSetCookie.call(response.headers) : [];
    if (cookies.length > 0) reply.header("set-cookie", cookies);
  }
  const payload = Buffer.from(await response.arrayBuffer());
  const requestUrl = new URL(request.url, "http://bff");
  if (request.method === "GET" && requestUrl.pathname === "/api/v1/ws" && requestUrl.searchParams.get("handshake") === "1") {
    // The NAS handshake intentionally leaves publicUrl null when LiveWS is on
    // the same host. From a local Web+BFF browser, however, the browser host is
    // the developer machine, not the NAS. Advertise the NAS live host so the
    // long-lived dashboard socket does not accidentally connect to localhost.
    try {
      const body = JSON.parse(payload.toString("utf8")) as { live?: { publicUrl?: string | null; port?: number; path?: string } };
      if (body.live && !body.live.publicUrl) {
        const targetUrl = new URL(options.target);
        const protocol = targetUrl.protocol === "https:" ? "wss:" : "ws:";
        const port = body.live.port ? `:${body.live.port}` : "";
        body.live.publicUrl = `${protocol}//${targetUrl.hostname}${port}`;
      }
      reply.header("content-type", "application/json; charset=utf-8");
      reply.send(JSON.stringify(body));
      return;
    } catch {
      // Preserve a non-JSON upstream response as-is.
    }
  }
  reply.send(payload);
}

function serializeBody(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}
