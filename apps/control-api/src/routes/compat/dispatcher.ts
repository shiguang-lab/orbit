import type { FastifyInstance } from "fastify";
import { registerCompatDispatcher } from "@shiguang-gateway/http-kernel";
import { controlRouteCatalog } from "./catalog.js";

/** Register only management compatibility routes on the control process. */
export function registerControlCompatRoutes(app: FastifyInstance): Promise<void> {
  return registerCompatDispatcher(app, {
    definitions: controlRouteCatalog(),
    accepts: (pathname) => {
      const isClient = pathname === "/api/v1" || pathname.startsWith("/api/v1/") || pathname === "/api/v1beta" || pathname.startsWith("/api/v1beta/") ||
        pathname === "/v1" || pathname.startsWith("/v1/") || pathname === "/v1beta" || pathname.startsWith("/v1beta/") ||
        pathname === "/a2a" || pathname.startsWith("/a2a/") || pathname === "/api/a2a" || pathname.startsWith("/api/a2a/") ||
        pathname === "/.well-known/agent.json" || pathname === "/api/.well-known/agent.json" || pathname === "/authorize" || pathname === "/docs/api/search";
      return !isClient;
    },
  });
}
