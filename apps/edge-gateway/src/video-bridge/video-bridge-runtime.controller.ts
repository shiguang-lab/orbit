import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VideoBridgeRuntimeService } from "./video-bridge-runtime.service.js";

@Controller("api/modality-bridge/video")
export class VideoBridgeRuntimeController {
  constructor(
    private readonly runtime: VideoBridgeRuntimeService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Get("runtime")
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.runtime.handle(webRequest));
  }
}
