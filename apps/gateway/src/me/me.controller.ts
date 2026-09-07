import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { MeService } from "./me.service.js";

@Controller(["v1/me/status", "api/v1/me/status"])
export class MeController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: MeService,
  ) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.get(req));
  }
}
