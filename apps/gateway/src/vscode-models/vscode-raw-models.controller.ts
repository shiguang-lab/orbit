import { Controller, Get, Options, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VscodeModelsService } from "./vscode-models.service.js";

@Controller([
  "v1/vscode/raw/:token/models",
  "api/v1/vscode/raw/:token/models",
  "v1/vscode/raw/:token/v1/models",
  "api/v1/vscode/raw/:token/v1/models",
])
export class VscodeRawModelsController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: VscodeModelsService) {}
  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string) { return this.routes.dispatch(request, reply, (req) => this.service.getRaw(req, token), { token }); }
  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.optionsRaw()); }
}
