import type {
  EdgeRuntimeCommand,
  EdgeRuntimeCommandPayload,
  EdgeRuntimeHealthSnapshot,
} from "@orbit/contracts/edge-runtime-command";
import { getInternalServiceAuthHeaders } from "@orbit/auth/internal-service";

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

/** Read the edge-owned task store using the caller's verified management identity. */
export async function readCloudAgentTasks(request: Request): Promise<Response> {
  const target = new URL("/api/v1/agents/tasks", edgeGatewayBaseUrl());
  target.search = new URL(request.url).search;
  const headers = new Headers({ Accept: "application/json" });
  for (const name of ["x-sg-identity", "authorization", "x-api-key", "x-goog-api-key"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(target, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Cloud agent task service unavailable" }, { status: 502 });
  }
}
