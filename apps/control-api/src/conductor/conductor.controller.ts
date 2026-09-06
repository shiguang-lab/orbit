import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ConductorService } from "./conductor.service.js";

@Controller("api/conductor")
export class ConductorController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly conductor: ConductorService) {}

  @Post("ask")
  ask(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.conductor.ask(request));
  }

  @Get("fleet")
  fleet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.conductor.fleet(request));
  }
}
