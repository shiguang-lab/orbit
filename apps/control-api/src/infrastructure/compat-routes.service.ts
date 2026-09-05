import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { FastifyInstance } from "fastify";
import { registerControlCompatRoutes } from "../routes/compat/dispatcher.js";

@Injectable()
export class CompatRoutesService implements OnModuleInit {
  constructor(@Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost) {}

  onModuleInit(): Promise<void> {
    return this.register(this.adapterHost.httpAdapter.getInstance() as FastifyInstance);
  }

  register(app: FastifyInstance): Promise<void> {
    return registerControlCompatRoutes(app);
  }
}
