import { Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { POST } from "./handlers/collect.handler.js";

@Controller("api/skills/collect/chaos")
export class ChaosCollectController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, POST);
  }
}
