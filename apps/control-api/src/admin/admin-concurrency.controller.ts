import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { AdminConcurrencyService } from "./admin-concurrency.service.js";

@Controller("api/admin/concurrency")
export class AdminConcurrencyController {
  constructor(@Inject(AdminConcurrencyService) private readonly concurrency: AdminConcurrencyService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const error = await requireManagementAuth(toWebRequest(request));
    if (!error) return true;
    reply.status(error.status).send(await error.json());
    return false;
  }

  @Get()
  async getStatus(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.concurrency.status());
    } catch (error) {
      console.error("[API] GET /api/admin/concurrency error:", error);
      return reply.status(500).send({ error: "Failed to load concurrency status" });
    }
  }

  @Post()
  async postAction(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    const action = new URL(request.raw.url ?? "", "http://localhost").searchParams.get("action");
    if (action !== "reset-semaphores") return reply.status(400).send({ error: "unknown action" });
    try {
      await this.concurrency.resetSemaphores();
      return reply.send({ ok: true, action });
    } catch (error) {
      console.error("[API] POST /api/admin/concurrency error:", error);
      return reply.status(500).send({ error: "Failed to reset semaphores" });
    }
  }
}
