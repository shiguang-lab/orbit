import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { registerCompatDispatcher, type CompatRouteDefinition } from "@shiguang-gateway/web-route-compat";
import { ownedEdgeRoutes, ownedEdgeRouteKeys } from "../owned-routes.manifest.js";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.name === "route.ts" || entry.name === "route.js") out.push(file);
  }
  return out;
}
function defs(root: string, apiRoot: string, isRoot = false): CompatRouteDefinition[] {
  return walk(root).map((file) => { const rel = relative(apiRoot, file).split("/"); rel.pop(); return { file, segments: rel, root: isRoot, score: rel.reduce((n, s) => n + (s.startsWith("[") ? 0 : 2), 0) }; });
}

function compileEdgeCatalog(): CompatRouteDefinition[] {
  const coreApp = fileURLToPath(new URL("../../../../../packages/core-domain/src/app/", import.meta.url));
  const coreApi = join(coreApp, "api");
  const edgeApi = fileURLToPath(new URL("../api/", import.meta.url));
  const edgeDefs = defs(edgeApi, edgeApi);
  const coreDefs = defs(coreApi, coreApi).filter((definition) => !ownedEdgeRouteKeys.has(definition.segments.join("/")));
  const roots = defs(coreApp, coreApp, true).filter((d) => !d.file.startsWith(`${coreApi}/`));
  return [...edgeDefs, ...coreDefs, ...roots].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.segments.length - a.segments.length);
}

export function registerEdgeCompatRoutes(app: FastifyInstance): Promise<void> {
  const definitions = compileEdgeCatalog();
  app.addHook("onRequest", async (request, reply) => {
    const pathname = new URL(request.url, "http://edge-gateway").pathname.replace(/^\/api(?=\/v1(?:\/|$))/, "");
    const owned = ownedEdgeRoutes.find((route) => {
      const pattern = new RegExp(`^${route.path.split("/").map((segment) => {
        if (segment === "*") return ".+";
        if (segment.startsWith(":")) return "[^/]+";
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("\\/")}$`);
      return pattern.test(pathname);
    });
    if (owned && !owned.methods.includes((request.method === "HEAD" ? "GET" : request.method) as never)) {
      return reply.status(405).send({ error: { type: "method_not_allowed", message: `${request.method} is not supported` }, requestId: request.id });
    }
  });
  const accepts = (pathname: string) => pathname === "/api" || pathname.startsWith("/api/") || pathname === "/v1" || pathname.startsWith("/v1/") || pathname === "/v1beta" || pathname.startsWith("/v1beta/") || pathname === "/a2a" || pathname.startsWith("/a2a/");
  registerCompatDispatcher(app, {
    definitions,
    accepts,
    // `/a2a` is registered by A2aRootController. Keep the wildcard for
    // legacy protocol subpaths, but do not register a duplicate exact route.
    rootPaths: ["/v1", "/v1/*", "/v1beta", "/v1beta/*", "/a2a/*"],
  });
  return Promise.resolve();
}
