import { Controller, Delete, Get, Inject, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  DELETE as deleteAlias,
  GET as getAliases,
  PUT as putAlias,
} from "@shiguang-gateway/core-domain/control/model-alias-routes";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";

@Controller("api/models/alias")
export class ModelsAliasController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => getAliases(req));
  }

  @Put()
  put(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => putAlias(req));
  }

  @Delete()
  delete(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => deleteAlias(req));
  }
}
