import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { registerCompatDispatcher, type CompatRouteDefinition } from "@shiguang-gateway/http-kernel";
import { ownedEdgeRoutes, ownedEdgeRouteKeys } from "../owned-routes.manifest.js";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out); else if (entry.name === "route.ts") out.push(file);
  }
  return out;
}
function defs(root: string, apiRoot: string, isRoot = false): CompatRouteDefinition[] {
  return walk(root).map((file) => { const rel = relative(apiRoot, file).split("/"); rel.pop(); return { file, segments: rel, root: isRoot, score: rel.reduce((n, s) => n + (s.startsWith("[") ? 0 : 2), 0) }; });
}

function compileEdgeCatalog(): CompatRouteDefinition[] {
  const coreApp = fileURLToPath(new URL("../../../../../packages/core-domain/src/app/", import.meta.url));
  const coreApi = join(coreApp, "api");
  const coreDefs = defs(coreApi, coreApi).filter((definition) => !ownedEdgeRouteKeys.has(definition.segments.join("/")));
  const roots = defs(coreApp, coreApp, true).filter((d) => !d.file.startsWith(`${coreApi}/`));
  return [...coreDefs, ...roots].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.segments.length - a.segments.length);
}

export function registerEdgeCompatRoutes(app: FastifyInstance): Promise<void> {
  const definitions = compileEdgeCatalog();
  app.addHook("onRequest", async (request, reply) => {
    const pathname = new URL(request.url, "http://edge-gateway").pathname.replace(/^\/api(?=\/v1(?:\/|$))/, "");
    const owned = ownedEdgeRoutes.find((route) => {
      const pattern = new RegExp(`^${route.path.replace(/:[^/]+/g, "[^/]+")}$`);
      return pattern.test(pathname);
    });
    if (owned && !owned.methods.includes((request.method === "HEAD" ? "GET" : request.method) as never)) {
      return reply.status(405).send({ error: { type: "method_not_allowed", message: `${request.method} is not supported` }, requestId: request.id });
    }
  });
  const accepts = (pathname: string) => pathname === "/api/v1" || pathname.startsWith("/api/v1/") || pathname === "/api/v1beta" || pathname.startsWith("/api/v1beta/") || pathname === "/v1" || pathname.startsWith("/v1/") || pathname === "/v1beta" || pathname.startsWith("/v1beta/") || pathname === "/a2a" || pathname.startsWith("/a2a/") || pathname === "/api/a2a" || pathname.startsWith("/api/a2a/") || pathname === "/.well-known/agent.json" || pathname === "/api/.well-known/agent.json" || pathname === "/authorize" || pathname === "/docs/api/search";
  registerCompatDispatcher(app, {
    definitions,
    accepts,
    rootPaths: ["/v1", "/v1/*", "/v1beta", "/v1beta/*", "/a2a", "/a2a/*", "/.well-known/agent.json", "/authorize", "/docs/api/search"],
  });
  return Promise.resolve();
}
