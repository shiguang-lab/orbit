import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { enforceApiKeyPolicy } from "@shiguang-gateway/core-domain/runtime/api-key-policy";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { SearchAnalyticsService } from "./search-analytics.service.js";

/** API-key policy protected search analytics endpoint. */
@Controller("api/v1/search")
export class SearchAnalyticsController {
  constructor(private readonly searchAnalyticsService: SearchAnalyticsService) {}

  @Get("analytics")
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const policy = await enforceApiKeyPolicy(request.raw as unknown as Request, "analytics");
    if (policy.rejection) {
      return reply.status(policy.rejection.status).headers(CORS_HEADERS).send(await policy.rejection.json());
    }

    try {
      return reply.headers(CORS_HEADERS).send(this.searchAnalyticsService.getSearchAnalytics());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[/api/v1/search/analytics]", message);
      return reply.status(500).headers(CORS_HEADERS).send({ error: "Internal server error" });
    }
  }
}
