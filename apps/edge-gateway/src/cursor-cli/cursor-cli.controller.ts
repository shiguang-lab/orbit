import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CursorCliService } from "./cursor-cli.service.js";

@Controller("api/cursor-cli")
export class CursorCliController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(CursorCliService) private readonly service: CursorCliService,
  ) {}

  @Get("*")
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply);
  }

  @Post("*")
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply);
  }

  private dispatch(request: FastifyRequest, reply: FastifyReply) {
    const raw = (request.params as Record<string, unknown> | undefined)?.["*"] ?? "";
    const path = String(raw).split("/").filter(Boolean).map(decodeURIComponent);
    return this.routes.dispatch(request, reply, (webRequest) => this.service.proxy(webRequest, path));
  }
}
