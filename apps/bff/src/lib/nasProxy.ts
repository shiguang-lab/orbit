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
}

/** Paths owned by the local BFF and never forwarded to NAS. */
export function isLocalBffPath(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname === "/api/healthz" ||
    pathname === "/api/livez" ||
    pathname === "/api/readyz" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/settings/require-login" ||
    // Provider metadata is the static Orbit catalog. Keep this endpoint local
    // so a NAS deployment with an older API cannot turn it into a 404.
    pathname === "/api/providers/catalog" ||
    /^\/api\/providers\/[^/]+\/catalog-models$/.test(pathname)
  );
}

/**
 * Forward a dashboard API request to the NAS-hosted Orbit instance.
 * Authentication is server-side: prefer the short-lived SSO identity issued
 * by the local broker, otherwise use a management-scoped API key configured on
 * the BFF. Browser cookies and arbitrary client authorization headers are not
 * forwarded, preventing the local proxy from becoming a credential relay.
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

  const pathname = request.url.startsWith("/") ? request.url : `/${request.url}`;
  const target = `${options.target.replace(/\/$/, "")}${pathname}`;
  const headers = new Headers();
  const contentType = request.headers["content-type"];
  if (typeof contentType === "string") headers.set("content-type", contentType);
  const accept = request.headers.accept;
  if (typeof accept === "string") headers.set("accept", accept);
  const csrf = request.headers["x-omniroute-csrf"];
  if (typeof csrf === "string") headers.set("x-omniroute-csrf", csrf);
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
      signal: AbortSignal.timeout(Number(process.env.OMNIROUTE_NAS_API_TIMEOUT_MS ?? 30_000)),
    });
  } catch (error) {
    reply.status(502).send({
      error: { type: "upstream_unavailable", message: "NAS API is unavailable" },
      requestId: request.id,
    });
    request.log.warn({ err: error }, "NAS API request failed");
    return;
  }

  reply.status(response.status);
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) reply.header(key, value);
  });
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
