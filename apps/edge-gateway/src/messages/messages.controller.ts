import { Controller, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { MessagesService } from "./messages.service.js";

@Controller(["v1/messages", "api/v1/messages"])
export class MessagesController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: MessagesService,
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
