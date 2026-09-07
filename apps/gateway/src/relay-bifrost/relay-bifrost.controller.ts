import { Controller, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { RelayBifrostService } from "./relay-bifrost.service.js";
@Controller(["v1/relay/chat/completions/bifrost", "api/v1/relay/chat/completions/bifrost"])
export class RelayBifrostController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: RelayBifrostService) {}
  @Post() post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.service.post(req)); }
  @Options() options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.options()); }
}
