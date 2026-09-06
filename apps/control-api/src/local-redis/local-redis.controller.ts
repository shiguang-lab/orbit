import { Controller, Get, Inject, Post, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { isLocalRequestAllowed } from "@shiguang-gateway/core-domain/control/local-endpoints";
import { LocalRedisService } from "./local-redis.service.js";

@Controller("api/local/redis")
export class LocalRedisController {
  constructor(@Inject(LocalRedisService) private readonly service: LocalRedisService) {}

  @Post("start")
  async start(@Res() reply: FastifyReply) { return this.dispatch(reply, () => this.service.start()); }

  @Get("status")
  async status(@Res() reply: FastifyReply) { return this.dispatch(reply, () => this.service.status()); }

  @Post("stop")
  async stop(@Res() reply: FastifyReply) { return this.dispatch(reply, () => this.service.stop()); }

  private async dispatch(reply: FastifyReply, action: () => Promise<{ status: number; body: unknown }>) {
    const guard = isLocalRequestAllowed();
    if (!guard.allowed) return reply.status(403).send({ error: guard.reason });
    const result = await action();
    return reply.status(result.status).send(result.body);
  }
}
