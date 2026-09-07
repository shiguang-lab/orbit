import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { WsService } from "./ws.service.js";

@Controller(["v1/ws", "api/v1/ws"])
export class WsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(WsService) private readonly wsService: WsService
  ) {}

  @Get()
  ws(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.wsService.handleWs(r));
  }
}
