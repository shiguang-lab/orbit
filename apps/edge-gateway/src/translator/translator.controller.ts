import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { TranslatorService } from "./translator.service.js";

@Controller("api/translator")
export class TranslatorController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: TranslatorService) {}

  @Post("detect") detect(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.service.detect(req)); }
  @Post("translate") translate(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.service.translate(req)); }
  @Post("transform-stream") transformStream(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.service.transformStream(req)); }
  @Post("send") send(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.service.send(req)); }
  @Get("history") history(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.service.history(req)); }
}
