import { Controller, Get, Inject, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { MuseCodeService } from "./muse-code.service.js";

@Controller(["v1/muse-code/models", "api/v1/muse-code/models"])
export class MuseCodeController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(MuseCodeService) private readonly service: MuseCodeService,
  ) {}

  @Get()
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.handleGet());
  }

  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.handleOptions());
  }
}
