import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type RouteDef = { file: string; segments: string[]; score: number; root: boolean };
type RouteModule = Record<string, (request: Request, context?: { params: Record<string, string> }) => Promise<Response> | Response>;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.name === "route.ts") out.push(file);
  }
  return out;
}

function compileRoutes(): RouteDef[] {
  const appRoot = fileURLToPath(new URL("../../../gateway-runtime/src/app/", import.meta.url));
  const apiRoot = join(appRoot, "api");
  const apiDefs = walk(apiRoot).map((file) => {
    const rel = relative(apiRoot, file).split("/");
    rel.pop();
    return { file, segments: rel, root: false, score: rel.reduce((n, s) => n + (s.startsWith("[") ? 0 : 2), 0) };
  });
  const rootDefs = walk(appRoot).filter((file) => !file.startsWith(`${apiRoot}/`)).map((file) => {
    const rel = relative(appRoot, file).split("/").filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
    rel.pop();
    return { file, segments: rel, root: true, score: rel.reduce((n, s) => n + (s.startsWith("[") ? 0 : 2), 0) };
  });
  return [...apiDefs, ...rootDefs].sort((a, b) => b.score - a.score || b.segments.length - a.segments.length);
}

function match(def: RouteDef, path: string): Record<string, string> | null {
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
  for (const [key, value] of Object.entries(request.headers)) if (typeof value === "string") headers.set(key, value);
  const method = request.method.toUpperCase();
  if (["GET", "HEAD"].includes(method)) return new Request(`http://${request.headers.host || "gateway"}${request.url}`, { method, headers });
  const body = request.body === undefined
    ? undefined
    : typeof request.body === "string" || request.body instanceof Uint8Array
      ? request.body
      : JSON.stringify(request.body);
  if (body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new Request(`http://${request.headers.host || "gateway"}${request.url}`, { method, headers, body: body as BodyInit | null | undefined });
}

export async function runtimeCatchallRoutes(
  app: FastifyInstance,
  options: { surface?: "all" | "edge-gateway" | "control-api" } = {},
): Promise<void> {
  const definitions = compileRoutes();
  const surface = options.surface ?? "all";
  const accepts = (url: string) => {
    if (surface === "all") return true;
    const pathname = new URL(url, "http://gateway").pathname;
    const isClient = pathname === "/api/v1" || pathname.startsWith("/api/v1/") || pathname === "/api/v1beta" || pathname.startsWith("/api/v1beta/") ||
      pathname === "/v1" || pathname.startsWith("/v1/") || pathname === "/v1beta" || pathname.startsWith("/v1beta/") ||
      pathname === "/a2a" || pathname.startsWith("/a2a/") || pathname === "/api/a2a" || pathname.startsWith("/api/a2a/") ||
      pathname === "/.well-known/agent.json" || pathname === "/api/.well-known/agent.json" ||
      pathname === "/readyz" || pathname === "/livez" || pathname === "/authorize" ||
      pathname === "/docs/api/search";
    // The /api/* catch-all is shared by both deployable surfaces. Explicitly
    // classify protocol routes here so management handlers cannot leak onto
    // the edge gateway, and protocol handlers cannot be dispatched by the
    // control API. Bespoke Fastify adapters remain the authoritative routes.
    if (pathname.startsWith("/api/") || pathname === "/api") {
      return surface === "edge-gateway" ? isClient : !isClient;
    }
    return surface === "edge-gateway" ? isClient : !isClient;
  };
  const dispatch = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!accepts(request.url)) return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
    const requestPath = new URL(request.url, "http://gateway").pathname;
    const isApiPath = requestPath.startsWith("/api/") || requestPath === "/api";
    const pathname = requestPath.replace(/^\/api\/?/, "").replace(/^\/+/, "");
    // Root /v1 and /v1beta are Next API route paths exposed without the /api
    // compatibility prefix; root /a2a and /.well-known are genuine app routes.
    const useApiDefinition = isApiPath || pathname === "v1" || pathname.startsWith("v1/") || pathname === "v1beta" || pathname.startsWith("v1beta/");
    const def = definitions.find((candidate) => candidate.root !== useApiDefinition && match(candidate, pathname) !== null);
    if (!def) return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
    const handlerName = request.method.toUpperCase();
    try {
      const mod = await import(pathToFileURL(def.file).href) as RouteModule;
      const handler = mod[handlerName] || mod["ALL"];
      if (typeof handler !== "function") return reply.status(405).send({ error: { type: "method_not_allowed", message: `${handlerName} is not supported` }, requestId: request.id });
      const response = await handler(await toRequest(request), { params: match(def, pathname) || {} });
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.code(response.status);
      if (!response.body) return reply.send();
      if (response.headers.get("content-type")?.includes("text/event-stream")) return reply.send(Readable.fromWeb(response.body as never));
      return reply.send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: { type: "runtime_error", message: error instanceof Error ? error.message : String(error) }, requestId: request.id });
    }
  };
  app.all("/api/*", dispatch);
  if (surface === "all" || surface === "edge-gateway") {
    // Public protocol clients use root /v1, /v1beta and /a2a paths. The
    // compatibility /api/v1 paths remain available for existing clients.
    app.all("/v1", dispatch);
    app.all("/v1/*", dispatch);
    app.all("/v1beta", dispatch);
    app.all("/v1beta/*", dispatch);
    app.all("/a2a", dispatch);
    app.all("/a2a/*", dispatch);
    app.all("/.well-known/agent.json", dispatch);
    app.all("/authorize", dispatch);
    app.all("/docs/api/search", dispatch);
  }
}
