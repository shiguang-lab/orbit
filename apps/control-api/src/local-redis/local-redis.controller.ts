import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isLocalRequestAllowed } from "./local-endpoints.js";
import { LocalRedisService } from "./local-redis.service.js";

@Controller("api/local/redis")
export class LocalRedisController {
  constructor(@Inject(LocalRedisService) private readonly service: LocalRedisService) {}

  @Post("start")
  async start(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.dispatch(request, reply, () => this.service.start()); }

  @Get("status")
  async status(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.dispatch(request, reply, () => this.service.status()); }

  @Post("stop")
  async stop(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.dispatch(request, reply, () => this.service.stop()); }

  private async dispatch(request: FastifyRequest, reply: FastifyReply, action: () => Promise<{ status: number; body: unknown }>) {
    const guard = isLocalRequestAllowed({ headers: request.headers, peerIp: request.ip });
    if (guard.allowed === false) return reply.status(403).send({ error: guard.reason });
    const result = await action();
    return reply.status(result.status).send(result.body);
  }
}
