import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { GET as docs } from "./handlers/docs.handler.js";
import { GET as codexCli } from "./handlers/codex-cli.handler.js";

@Controller("api/docs")
export class DocsController {
  constructor(private readonly routes: WebRouteDispatcher) {}
  @Get() get(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => docs()); }
  @Get("codex-cli") codex(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => codexCli()); }
}
