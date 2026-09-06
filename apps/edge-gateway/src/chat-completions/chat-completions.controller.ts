import { Controller, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ChatCompletionsService } from "./chat-completions.service.js";

@Controller(["v1/chat/completions", "api/v1/chat/completions"])
export class ChatCompletionsController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: ChatCompletionsService) {}
  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.post(req));
  }
  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }
}
