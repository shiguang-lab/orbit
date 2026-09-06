import { Controller, Get, Options, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VscodeCombosService } from "./vscode-combos.service.js";

@Controller(["v1/vscode/:token/combos", "api/v1/vscode/:token/combos", "v1/vscode/raw/:token/combos", "api/v1/vscode/raw/:token/combos"])
export class VscodeTokenCombosController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: VscodeCombosService) {}
  @Get()
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string) { return this.routes.dispatch(req, reply, (r) => this.service.getToken(r, token), { token }); }
  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.optionsToken()); }
}
