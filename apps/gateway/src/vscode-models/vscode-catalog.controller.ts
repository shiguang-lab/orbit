import { Controller, Get, Options, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VscodeModelsService } from "./vscode-models.service.js";

@Controller(["v1/vscode/:token", "api/v1/vscode/:token", "v1/vscode/raw/:token", "api/v1/vscode/raw/:token"])
export class VscodeCatalogController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: VscodeModelsService) {}
  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string) {
    const raw = request.url.includes("/vscode/raw/");
    return this.routes.dispatch(request, reply, (req) => raw ? this.service.getRaw(req, token) : this.service.get(req, token), { token });
  }
  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.options()); }
}
