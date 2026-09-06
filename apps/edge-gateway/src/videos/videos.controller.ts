import { Controller, Get, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VideosService } from "./videos.service.js";

@Controller(["v1/videos", "api/v1/videos"])
export class VideosController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(VideosService) private readonly videosService: VideosService,
  ) {}

  @Options("generations")
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.videosService.handleOptions());
  }

  @Get("generations")
  getGenerations(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.videosService.handleGetGenerations(r));
  }

  @Post("generations")
  generations(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.videosService.handleGenerations(r));
  }
}

