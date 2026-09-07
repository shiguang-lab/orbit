import { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest } from "fastify";

export type WebRouteHandler = (
  request: Request,
  context?: { params: Record<string, string> },
) => Promise<Response> | Response;

export function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) {
      headers.set(key, value.filter((item): item is string => typeof item === "string").join(", "));
    }
  }
  const method = request.method.toUpperCase();
  if (["GET", "HEAD"].includes(method)) {
    return new Request(`http://${request.headers.host || "gateway"}${request.url}`, { method, headers });
  }
  const body = request.body === undefined
    ? undefined
    : typeof request.body === "string" || request.body instanceof Uint8Array
      ? request.body
      : JSON.stringify(request.body);
  if (body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new Request(`http://${request.headers.host || "gateway"}${request.url}`, {
    method,
    headers,
    body: body as BodyInit | null | undefined,
  });
}

/** Adapt one explicitly selected Web Request handler to Fastify transport. */
export async function dispatchWebRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  handler: WebRouteHandler,
  params: Record<string, string> = {},
): Promise<unknown> {
  const response = await handler(toWebRequest(request), { params });
  response.headers.forEach((value, key) => reply.header(key, value));
  reply.code(response.status);
  if (!response.body) return reply.send();
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    return reply.send(Readable.fromWeb(response.body as never));
  }
  return reply.send(Buffer.from(await response.arrayBuffer()));
}
