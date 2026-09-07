import { toWebRequest } from "@orbit/http/web-handler";
import { Controller, Get, Inject, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { AnalyticsService } from "./analytics.service.js";

/** Compression analytics alias used by the admin UI and CLI clients. */
@Controller("api/context/analytics")
export class ContextAnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getSummary(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("since") since?: string,
  ) {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      return reply.send(this.analyticsService.getCompressionAnalytics(since));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[/api/context/analytics]", msg);
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  @Get("engine")
  async getEngine(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("engineId") engineId?: string,
    @Query("days") daysParam?: string,
  ) {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    if (!engineId) {
      return reply.status(400).send({ error: "engineId query parameter is required" });
    }

    try {
      const days = daysParam ? Math.max(1, Math.floor(Number(daysParam))) || 7 : 7;
      return reply.send(this.analyticsService.getPerEngineCompressionAnalytics(engineId, days));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[/api/context/analytics/engine]", msg);
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
}
