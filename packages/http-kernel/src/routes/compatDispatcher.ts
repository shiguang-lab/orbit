import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export type CompatRouteDefinition = { file: string; segments: string[]; score: number; root?: boolean };
export type WebRouteHandler = (request: Request, context?: { params: Record<string, string> }) => Promise<Response> | Response;
export type CompatRouteModule = Record<string, WebRouteHandler>;
export type CompatDispatcherOptions = { definitions: readonly CompatRouteDefinition[]; accepts?: (pathname: string) => boolean; rootPaths?: readonly string[] };

export function matchCompatRoute(def: CompatRouteDefinition, path: string): Record<string, string> | null {
  const actual = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean).map(decodeURIComponent);
  const params: Record<string, string> = {};
  let i = 0;
  for (const segment of def.segments) {
    if (segment.startsWith("[[...") && segment.endsWith("]]")) { params[segment.slice(5, -2)] = actual.slice(i).join("/"); i = actual.length; break; }
    if (segment.startsWith("[...") && segment.endsWith("]")) { if (i >= actual.length) return null; params[segment.slice(4, -1)] = actual.slice(i).join("/"); i = actual.length; break; }
    if (segment.startsWith("[") && segment.endsWith("]")) { if (i >= actual.length) return null; params[segment.slice(1, -1)] = actual[i++]; continue; }
    if (actual[i++] !== segment) return null;
  }
  return i === actual.length ? params : null;
}

async function toRequest(request: FastifyRequest): Promise<Request> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.filter((item): item is string => typeof item === "string").join(", "));
  }
  const method = request.method.toUpperCase();
  if (["GET", "HEAD"].includes(method)) return new Request(`http://${request.headers.host || "gateway"}${request.url}`, { method, headers });
  const body = request.body === undefined ? undefined : typeof request.body === "string" || request.body instanceof Uint8Array ? request.body : JSON.stringify(request.body);
  if (body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new Request(`http://${request.headers.host || "gateway"}${request.url}`, { method, headers, body: body as BodyInit | null | undefined });
}

/** Adapt one explicitly selected Web Request handler to Fastify transport. */
export async function dispatchWebRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  handler: WebRouteHandler,
  params: Record<string, string> = {},
): Promise<unknown> {
  const response = await handler(await toRequest(request), { params });
  response.headers.forEach((value, key) => reply.header(key, value));
  reply.code(response.status);
  if (!response.body) return reply.send();
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    return reply.send(Readable.fromWeb(response.body as never));
  }
  return reply.send(Buffer.from(await response.arrayBuffer()));
}

/** Transport-only compatibility dispatcher. Catalog discovery and surface policy belong to each app. */
export function registerCompatDispatcher(app: FastifyInstance, options: CompatDispatcherOptions): Promise<void> {
  const definitions = [...options.definitions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.segments.length - a.segments.length);
  const accepts = options.accepts ?? (() => true);
  const dispatch = async (request: FastifyRequest, reply: FastifyReply) => {
    const requestPath = new URL(request.url, "http://gateway").pathname;
    if (!accepts(requestPath)) return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
    const isApiPath = requestPath.startsWith("/api/") || requestPath === "/api";
    const pathname = requestPath.replace(/^\/api\/?/, "").replace(/^\/+/, "");
    const useApiDefinition = isApiPath || pathname === "v1" || pathname.startsWith("v1/") || pathname === "v1beta" || pathname.startsWith("v1beta/");
    const def = definitions.find((candidate) => candidate.root !== useApiDefinition && matchCompatRoute(candidate, pathname) !== null);
    if (!def) return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
    try {
      const mod = await import(pathToFileURL(def.file).href) as CompatRouteModule;
      const method = request.method.toUpperCase();
      const handler = mod[method] || mod.ALL;
      if (typeof handler !== "function") return reply.status(405).send({ error: { type: "method_not_allowed", message: `${method} is not supported` }, requestId: request.id });
      return await dispatchWebRoute(request, reply, handler, matchCompatRoute(def, pathname) || {});
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: { type: "runtime_error", message: error instanceof Error ? error.message : String(error) }, requestId: request.id });
    }
  };
  app.all("/api", dispatch);
  app.all("/api/*", dispatch);
  for (const rootPath of options.rootPaths ?? []) app.all(rootPath, dispatch);
  return Promise.resolve();
}
