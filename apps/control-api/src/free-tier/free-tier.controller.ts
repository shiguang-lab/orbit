import { Controller, Get, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { FreeTierService } from "./free-tier.service.js";

@Controller("api/free-provider-rankings")
export class FreeProviderRankingsController {
  constructor(
    private readonly service: FreeTierService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.options());
  }

  @Get()
  rankings(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.rankings(request));
  }
}
