import { Controller, Delete, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { LogsService } from "./logs.service.js";

@Controller("api/logs")
export class LogsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(LogsService) private readonly logs: LogsService,
  ) {}

  @Get("console")
  getConsole(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.getConsole(request));
  }

  @Get("detail")
  getDetail(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.getDetail(request));
  }

  @Post("detail")
  updateDetail(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.updateDetail(request));
  }

  @Get("export")
  export(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.export(request));
  }

  @Get(":id")
  getById(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.getById(request, id), { id });
  }
}
