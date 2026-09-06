import { Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CodexResponsesWsService } from "./codex-responses-ws.service.js";

@Controller("api/internal/codex-responses-ws")
export class CodexResponsesWsController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: CodexResponsesWsService,
  ) {}

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.post(webRequest));
  }
}
