import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

/** Compatibility endpoint retained while clients migrate to /api/rate-limits. */
@Controller("api/rate-limit")
export class LegacyRateLimitController {
  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.redirect(request, reply); }
  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.redirect(request, reply); }
  private redirect(request: FastifyRequest, reply: FastifyReply) {
    const host = request.hostname;
    const query = request.raw.url?.split("?")[1];
    return reply.redirect(308, `${request.protocol}://${host}/api/rate-limits${query ? `?${query}` : ""}`);
  }
}
