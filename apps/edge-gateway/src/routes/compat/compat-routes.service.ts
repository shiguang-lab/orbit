import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { FastifyInstance } from "fastify";
import { registerEdgeCompatRoutes } from "./dispatcher.js";

@Injectable()
export class CompatRoutesService implements OnApplicationBootstrap {
  constructor(@Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost) {}

  async onApplicationBootstrap(): Promise<void> {
    const fastify = this.adapterHost.httpAdapter.getInstance() as FastifyInstance;
    await registerEdgeCompatRoutes(fastify);
  }
}
