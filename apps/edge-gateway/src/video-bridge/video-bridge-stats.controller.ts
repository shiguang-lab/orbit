import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VideoBridgeStatsService } from "./video-bridge-stats.service.js";

@Controller("api/modality-bridge")
export class VideoBridgeStatsController {
  constructor(
    private readonly stats: VideoBridgeStatsService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Get("stats")
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.stats.handle(webRequest));
  }
}
