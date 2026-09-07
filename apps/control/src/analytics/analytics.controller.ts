import { toWebRequest } from "@orbit/http/web-handler";
import { Controller, Get, Inject, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AnalyticsService } from "./analytics.service.js";
import { requireManagementAuth } from "@orbit/core/control/management-auth";

@Controller("api/analytics")
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get("auto-routing")
  async getAutoRouting(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    return reply.send(this.analyticsService.getAutoRoutingAnalytics());
  }

  @Get("compression")
  async getCompression(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("since") since?: string
  ) {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const summary = this.analyticsService.getCompressionAnalytics(since);
      return reply.send(summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[/api/analytics/compression]", msg);
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  @Get("diversity")
  async getDiversity(@Res() reply: FastifyReply) {
    try {
      const report = await this.analyticsService.getDiversityAnalytics();
      return reply.send(report);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ error: message });
    }
  }
}
