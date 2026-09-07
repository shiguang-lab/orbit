import { Controller, Get, Inject, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CombosService } from "./combos.service.js";

@Controller(["v1/combos", "api/v1/combos"])
export class CombosController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(CombosService) private readonly combosService: CombosService,
  ) {}

  @Get()
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combosService.handleGet(request));
  }

  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.combosService.handleOptions());
  }
}
