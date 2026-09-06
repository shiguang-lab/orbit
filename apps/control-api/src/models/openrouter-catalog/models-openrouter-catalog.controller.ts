import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { GET as getOpenRouterCatalog } from "@shiguang-gateway/core-domain/control/openrouter-catalog-route";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";

@Controller("api/models/openrouter-catalog")
export class ModelsOpenRouterCatalogController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => getOpenRouterCatalog(req));
  }
}
