import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { FastifyInstance } from "fastify";
import { ownedEdgeRoutes } from "./owned-routes.manifest.js";

@Injectable()
export class MethodGuardService implements OnApplicationBootstrap {
  constructor(@Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost) {}

  onApplicationBootstrap(): void {
    const app = this.adapterHost.httpAdapter.getInstance() as FastifyInstance;
    app.addHook("onRequest", async (request, reply) => {
      const pathname = new URL(request.url, "http://gateway").pathname.replace(/^\/api(?=\/v1(?:\/|$))/, "");
      const owned = ownedEdgeRoutes.find((route) => {
        const pattern = new RegExp(`^${route.path.split("/").map((segment) => {
          if (segment === "*") return ".+";
          if (segment.startsWith(":")) return "[^/]+";
          return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }).join("\\/")}$`);
        return pattern.test(pathname);
      });
      const method = request.method === "HEAD" ? "GET" : request.method;
      if (owned && !owned.methods.includes(method as never)) {
        return reply.status(405).send({
          error: { type: "method_not_allowed", message: `${request.method} is not supported` },
          requestId: request.id,
        });
      }
    });
  }
}
