import { Controller, Get, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VscodeCombosService } from "./vscode-combos.service.js";

@Controller(["v1/vscode/combos/:token/*", "api/v1/vscode/combos/:token/*"])
export class VscodeCombosController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: VscodeCombosService) {}
  @Get()
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string, @Param("0") slug?: string) {
    return this.routes.dispatch(req, reply, (r) => this.service.get(r, token, slug ? slug.split("/") : []), { token, ...(slug ? { slug } : {}) });
  }
  @Post()
  post(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string, @Param("0") slug?: string) {
    return this.routes.dispatch(req, reply, (r) => this.service.post(r, token, slug ? slug.split("/") : []), { token, ...(slug ? { slug } : {}) });
  }
  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.options());
  }
}
