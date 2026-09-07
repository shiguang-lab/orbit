import { Controller, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { RelayChatService } from "./relay-chat.service.js";

@Controller(["v1/relay/chat/completions", "api/v1/relay/chat/completions"])
export class RelayChatController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: RelayChatService,
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
