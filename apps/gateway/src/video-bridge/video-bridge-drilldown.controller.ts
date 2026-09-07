import { Controller, Delete, Get, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VideoBridgeDrilldownService } from "./video-bridge-drilldown.service.js";

@Controller(["v1/video-bridge", "api/v1/video-bridge"])
export class VideoBridgeDrilldownController {
  constructor(private readonly drilldown: VideoBridgeDrilldownService, private readonly routes: WebRouteDispatcher) {}

  @Options("drilldown")
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.drilldown.options());
  }

  @Get("drilldown")
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.drilldown.consume(request));
  }

  @Delete("drilldown")
  delete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.drilldown.consume(request));
  }
}
