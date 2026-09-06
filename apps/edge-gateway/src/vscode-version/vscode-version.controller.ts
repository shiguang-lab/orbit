import { Controller, Get, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VscodeVersionService } from "./vscode-version.service.js";

@Controller([
  "v1/vscode/:token/api/version",
  "api/v1/vscode/:token/api/version",
])
export class VscodeVersionController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: VscodeVersionService,
  ) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.get());
  }

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }
}
