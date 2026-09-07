import { Controller, Get, Inject, Options, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProviderModelsService } from "./provider-models.service.js";

@Controller(["v1/providers/:provider/models", "api/v1/providers/:provider/models"])
export class ProviderModelsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ProviderModelsService) private readonly service: ProviderModelsService,
  ) {}

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.handleOptions());
  }

  @Get()
  get(@Param("provider") provider: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.service.handleGet(r, provider), { provider });
  }
}
