import { Controller, Get, Param, Post, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { JobsService } from "./jobs.service.js";

@Controller("api/jobs")
export class JobsController {
  constructor(private readonly service: JobsService) {}
  @Get() list(@Res() reply: FastifyReply) { return this.send(reply, this.service.list()); }
  @Get(":id/runs") async runs(@Param("id") id: string, @Res() reply: FastifyReply) { return this.send(reply, await this.service.runs(id)); }
  @Post(":id/enable") async enable(@Param("id") id: string, @Res() reply: FastifyReply) { return this.send(reply, await this.service.toggle(id, true)); }
  @Post(":id/disable") async disable(@Param("id") id: string, @Res() reply: FastifyReply) { return this.send(reply, await this.service.toggle(id, false)); }
  @Post(":id/run-now") async runNow(@Param("id") id: string, @Res() reply: FastifyReply) { return this.send(reply, await this.service.runNow(id)); }
  private async send(reply: FastifyReply, response: Response) {
    const body = await response.json().catch(() => undefined);
    return reply.status(response.status).send(body);
  }
}
