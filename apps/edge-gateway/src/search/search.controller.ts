import { Controller, Get, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { SearchService } from "./search.service.js";

@Controller(["v1/search", "api/v1/search"])
export class SearchController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: SearchService) {}
  @Get() get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.get());
  }
  @Post() post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.post(req));
  }
  @Options() options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }
}
