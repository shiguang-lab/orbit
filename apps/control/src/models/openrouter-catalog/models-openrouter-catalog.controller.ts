import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { GET as getOpenRouterCatalog } from "./models-openrouter-catalog.handler.js";

@Controller("api/models/openrouter-catalog")
export class ModelsOpenRouterCatalogController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => getOpenRouterCatalog(req));
  }
}
