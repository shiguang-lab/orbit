import { Controller, Get, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { FreeTierService } from "./free-tier.service.js";

@Controller("api/free-tier/summary")
export class FreeTierSummaryController {
  constructor(
    private readonly service: FreeTierService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.options());
  }

  @Get()
  summary(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async (request) => {
      return this.service.summary(request, await isAuthenticated(request));
    });
  }
}
