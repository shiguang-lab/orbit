import { Controller, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VscodeResponsesService } from "./vscode-responses.service.js";

@Controller([
  "v1/vscode/:token/responses",
  "api/v1/vscode/:token/responses",
  "v1/vscode/raw/:token/responses",
  "api/v1/vscode/raw/:token/responses",
])
export class VscodeResponsesController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: VscodeResponsesService) {}
  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string) {
    return this.routes.dispatch(request, reply, (req) => this.service.post(req, token));
  }
  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }
}
