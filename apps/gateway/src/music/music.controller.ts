import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { MusicService } from "./music.service.js";

@Controller(["v1/music", "api/v1/music"])
export class MusicController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(MusicService) private readonly musicService: MusicService
  ) {}

  @Get("generations")
  getGenerations(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.musicService.handleGetGenerations(r));
  }

  @Post("generations")
  createGeneration(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.musicService.handleCreateGeneration(r));
  }
}
