import { Inject, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { DELETE, GET, POST } from "./handlers/sync.handler.js";

@Controller("api/intelligence/sync")
export class IntelligenceController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, GET);
  }

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, POST);
  }

  @Delete()
  delete(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, DELETE);
  }
}
