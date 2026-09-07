import { Inject, Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { SearchStatsService } from "./search-stats.service.js";

@Controller("api/search/stats")
export class SearchStatsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(SearchStatsService) private readonly stats: SearchStatsService,
  ) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.stats.get(webRequest));
  }
}
