import { Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VideoBridgeBrokerService } from "./video-bridge-broker.service.js";

@Controller("api/modality-bridge/video")
export class VideoBridgeBrokerController {
  constructor(private readonly broker: VideoBridgeBrokerService, private readonly routes: WebRouteDispatcher) {}

  @Post("extract")
  extract(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.broker.extract(request));
  }

  @Get("drilldown")
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.broker.drilldown(request));
  }

  @Post("drilldown")
  post(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.broker.drilldown(request));
  }

  @Delete("drilldown")
  delete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.broker.drilldown(request));
  }
}
