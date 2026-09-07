import { Inject, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { FallbackService } from "./fallback.service.js";

@Controller("api/fallback/chains")
export class FallbackController {
  constructor(@Inject(FallbackService) private readonly service: FallbackService, @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Get()
  list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.list());
  }

  @Post()
  create(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.create(request));
  }

  @Delete()
  remove(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.remove(request));
  }
}
