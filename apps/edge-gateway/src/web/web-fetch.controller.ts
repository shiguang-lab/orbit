import { Controller, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { WebFetchService } from "./web-fetch.service.js";

@Controller(["v1/web", "api/v1/web"])
export class WebFetchController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(WebFetchService) private readonly webFetchService: WebFetchService,
  ) {}

  @Options("fetch")
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.webFetchService.handleOptions());
  }

  @Post("fetch")
  fetch(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.webFetchService.handleFetch(request));
  }
}
