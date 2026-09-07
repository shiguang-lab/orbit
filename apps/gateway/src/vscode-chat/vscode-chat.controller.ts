import { Controller, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VscodeChatService } from "./vscode-chat.service.js";

@Controller([
  "v1/vscode/:token/chat/completions",
  "api/v1/vscode/:token/chat/completions",
  "v1/vscode/:token/v1/chat/completions",
  "api/v1/vscode/:token/v1/chat/completions",
  "v1/vscode/:token/api/chat",
  "api/v1/vscode/:token/api/chat",
  "v1/vscode/raw/:token/chat/completions",
  "api/v1/vscode/raw/:token/chat/completions",
  "v1/vscode/raw/:token/v1/chat/completions",
  "api/v1/vscode/raw/:token/v1/chat/completions",
  "v1/vscode/raw/:token/api/chat",
  "api/v1/vscode/raw/:token/api/chat",
])
export class VscodeChatController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: VscodeChatService) {}
  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string) {
    return this.routes.dispatch(request, reply, (req) => this.service.post(req, token));
  }
  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }
}
