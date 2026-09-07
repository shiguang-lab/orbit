import { toWebRequest } from "@orbit/http/web-handler";
import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { AuditLogService } from "./audit-log.service.js";

@Controller("api/compliance/audit-log")
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @Get()
  async get(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Query() query: Record<string, string>) {
    const authError = await requireManagementAuth(toWebRequest(req));
    if (authError) return reply.status(authError.status).send(await authError.json());
    try {
      const result = this.service.get(query);
      return reply.headers(result.headers).send(result.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch audit log";
      return reply.status(500).send({ error: { status: 500, message } });
    }
  }
}
