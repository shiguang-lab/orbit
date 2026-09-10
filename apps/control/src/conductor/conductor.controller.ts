import { Controller, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ConductorService } from "./conductor.service.js";

@Controller("api/conductor")
export class ConductorController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ConductorService) private readonly conductor: ConductorService,
  ) {}

  @Post("ask")
  ask(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.conductor.ask(request));
  }

  @Get("fleet")
  fleet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.conductor.fleet(request));
  }
  @Post("tasks")
  create(@Req() req:FastifyRequest,@Res() reply:FastifyReply){return this.routes.dispatch(req,reply,request=>this.conductor.create(request));}

  @Get("tasks/:id")
  task(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.conductor.task(request, id), { id });
  }

  @Post("tasks/:id/cancel")
  cancel(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.conductor.cancel(request, id), { id });
  }
}
