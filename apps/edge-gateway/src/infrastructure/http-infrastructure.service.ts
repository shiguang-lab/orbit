import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { FastifyInstance } from "fastify";
import { registerHttpInfrastructure } from "@shiguang-gateway/http-kernel";

@Injectable()
export class HttpInfrastructureService implements OnModuleInit {
  constructor(@Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost) {}

  async onModuleInit(): Promise<void> {
    const fastify = this.adapterHost.httpAdapter.getInstance() as FastifyInstance;
    await registerHttpInfrastructure(fastify);
  }
}
