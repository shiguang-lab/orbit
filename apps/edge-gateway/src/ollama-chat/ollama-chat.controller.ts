import { Controller, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { OllamaChatService } from "./ollama-chat.service.js";

@Controller(["v1/api/chat", "api/v1/api/chat"])
export class OllamaChatController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: OllamaChatService,
  ) {}

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.post(req));
  }

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }
}
