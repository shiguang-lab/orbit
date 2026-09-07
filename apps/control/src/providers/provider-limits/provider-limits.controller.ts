import { Inject, Controller, Get, Param, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { ProviderLimitsService } from "./provider-limits.service.js";

@Controller("api/v1/providers/:provider/limits")
export class ProviderLimitsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ProviderLimitsService) private readonly service: ProviderLimitsService,
  ) {}

  @Get()
  get(
    @Param("provider") provider: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, (req) => this.service.get(req, provider), { provider });
  }

  @Put()
  put(
    @Param("provider") provider: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, (req) => this.service.put(req, provider), { provider });
  }
}
