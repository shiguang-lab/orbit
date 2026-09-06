import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { RateLimitsService } from "./rate-limits.service.js";

@Controller("api/rate-limits")
export class RateLimitsController {
  constructor(private readonly service: RateLimitsService) {}

  @Get()
  get(@Res() reply: FastifyReply) {
    return this.service.getStatus(reply);
  }

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.service.toggle(request, reply);
  }
}
