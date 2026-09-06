import { Controller, Get, Inject, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ConversationsService } from "./conversations.service.js";

@Controller("api/conversations")
export class ConversationsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ConversationsService) private readonly conversations: ConversationsService,
  ) {}

  @Get()
  getConversations(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.conversations.getConversations(req));
  }

  @Get(":id/tree")
  getTree(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.conversations.getTree(req, id), { id });
  }
}
