import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { GET as getCatalog } from "./models-catalog.handler.js";

@Controller("api/models/catalog")
export class ModelsCatalogController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => getCatalog(req));
  }
}
