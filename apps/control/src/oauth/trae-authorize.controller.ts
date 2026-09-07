import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { GET } from "./handlers/trae/authorize/handler.js";

@Controller("authorize")
export class TraeAuthorizeController {
  constructor(private readonly routes: WebRouteDispatcher) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, GET);
  }
}
