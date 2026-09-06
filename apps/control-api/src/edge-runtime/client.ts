import type {
  EdgeRuntimeCommand,
  EdgeRuntimeCommandPayload,
  EdgeRuntimeHealthSnapshot,
} from "@shiguang-gateway/contracts/edge-runtime-command";
import { getInternalServiceAuthHeaders } from "@shiguang-gateway/auth/internal-service";

function edgeGatewayBaseUrl(): string {
  const configured = process.env.EDGE_GATEWAY_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1").trim();
  const reachableHost = host === "0.0.0.0" || host === "::" || host === "[::]" ? "127.0.0.1" : host;
  return `http://${reachableHost}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {}
  return `Edge runtime command failed (${response.status})`;
}

export async function forwardEdgeHttpRequest(request: Request): Promise<Response> {
  const sourceUrl = new URL(request.url);
  const headers = new Headers(request.headers);
  for (const [name, value] of Object.entries(getInternalServiceAuthHeaders())) {
    headers.set(name, value);
  }

  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.arrayBuffer();
  return fetch(`${edgeGatewayBaseUrl()}${sourceUrl.pathname}${sourceUrl.search}`, {
    method: request.method,
    headers,
    body,
    signal: request.signal,
    redirect: request.redirect,
  });
}

export async function executeEdgeRuntimeCommand<T = unknown>(
  command: EdgeRuntimeCommandPayload,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const response = await fetch(`${edgeGatewayBaseUrl()}/api/internal/runtime/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getInternalServiceAuthHeaders() },
    body: JSON.stringify({ version: 1, ...command } satisfies EdgeRuntimeCommand),
    signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

export function readEdgeRuntimeHealth(): Promise<EdgeRuntimeHealthSnapshot> {
  return executeEdgeRuntimeCommand({ command: "health.snapshot" });
}
