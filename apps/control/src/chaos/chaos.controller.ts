import { Controller, Delete, Get, Inject, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ChaosService } from "./chaos.service.js";

@Controller("api/chaos")
export class ChaosController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ChaosService) private readonly chaos: ChaosService,
  ) {}

  @Get("config")
  getConfig(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.chaos.getConfig(request));
  }

  @Put("config")
  updateConfig(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.chaos.updateConfig(request));
  }

  @Delete("config")
  resetConfig(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.chaos.resetConfig(request));
  }

  @Post("run")
  run(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.chaos.run(request));
  }
}
