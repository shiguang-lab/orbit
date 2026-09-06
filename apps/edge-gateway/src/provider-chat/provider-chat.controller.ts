import { Controller, Inject, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProviderChatService } from "./provider-chat.service.js";

@Controller(["v1/providers/:provider/chat/completions", "api/v1/providers/:provider/chat/completions"])
export class ProviderChatController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ProviderChatService) private readonly service: ProviderChatService,
  ) {}

  @Post()
  post(@Param("provider") provider: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.service.handlePost(r, provider), { provider });
  }

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.handleOptions());
  }
}
