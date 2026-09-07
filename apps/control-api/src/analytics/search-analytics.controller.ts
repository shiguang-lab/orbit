import { toWebRequest } from "@orbit/http/web-handler";
import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { SearchAnalyticsService } from "./search-analytics.service.js";

/** Dashboard search aggregates use the SSO management surface. */
@Controller("api/search")
export class SearchAnalyticsController {
  constructor(@Inject(SearchAnalyticsService) private readonly searchAnalyticsService: SearchAnalyticsService) {}

  @Get("analytics")
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      return reply.header("cache-control", "no-store").send(this.searchAnalyticsService.getSearchAnalytics());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[/api/search/analytics]", message);
      return reply.status(500).send({ error: "Failed to load search analytics" });
    }
  }
}
