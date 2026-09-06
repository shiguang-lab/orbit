import { Controller, Get, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VscodeOllamaService } from "./vscode-ollama.service.js";

@Controller(["v1/vscode/:token/api", "api/v1/vscode/:token/api"])
export class VscodeOllamaController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: VscodeOllamaService) {}
  @Get("tags") tags(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string) { return this.routes.dispatch(req, reply, r => this.service.tags(r, token), { token }); }
  @Post("show") showPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("token") token: string) { return this.routes.dispatch(req, reply, r => this.service.showPost(r, token), { token }); }
  @Options("tags") tagsOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.tagsOptions()); }
  @Options("show") showOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.showOptions()); }
}
