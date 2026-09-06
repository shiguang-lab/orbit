import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { DbHealthService } from "./db-health.service.js";

@Controller("api/db/health")
export class DbHealthController {
  constructor(@Inject(DbHealthService) private readonly service: DbHealthService) {}

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(request.raw as unknown as Request))) {
      return reply.status(401).send({ error: { message: "Authentication required" } });
    }

    try {
      return reply.send(this.service.diagnose());
    } catch (error) {
      const message = this.service.errorMessage(error);
      console.error("[API] DB health diagnosis failed:", message);
      return reply.status(500).send({ error: { message } });
    }
  }

  @Post()
  async post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(request.raw as unknown as Request))) {
      return reply.status(401).send({ error: { message: "Authentication required" } });
    }

    try {
      return reply.send(this.service.repair());
    } catch (error) {
      const message = this.service.errorMessage(error);
      console.error("[API] DB health repair failed:", message);
      return reply.status(500).send({ error: { message } });
    }
  }
}
