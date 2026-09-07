import { Controller, Get, Inject, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { GET as getModels, PUT as putModelAlias } from "./models.handler.js";
import { ModelsService } from "./models.service.js";

@Controller("api/models")
export class ModelsController {
  constructor(
    @Inject(ModelsService) private readonly models: ModelsService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => getModels(req));
  }

  @Put()
  put(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => putModelAlias(req));
  }

  @Post("test")
  test(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.models.handleTest(req));
  }

  @Post("test-all")
  testAll(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.models.handleTestAll(req));
  }
}
