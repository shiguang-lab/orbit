import { Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ModelsService } from "./models.service.js";

@Controller("api/models")
export class ModelsController {
  constructor(
    @Inject(ModelsService) private readonly models: ModelsService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Post("test")
  test(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.models.handleTest(req));
  }

  @Post("test-all")
  testAll(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.models.handleTestAll(req));
  }
}
