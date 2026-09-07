import { Controller, Delete, Get, Inject, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { LogsService } from "./logs.service.js";

@Controller("api/usage")
export class UsageLogsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(LogsService) private readonly logs: LogsService,
  ) {}

  @Get("logs")
  getUsage(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.getUsage(request));
  }

  @Get("request-logs")
  getRequests(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.getRequests(request));
  }

  @Get("call-logs")
  getCalls(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.getCalls(request));
  }

  @Get("call-logs/:id")
  getCallById(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.getCallById(request, id), { id });
  }

  @Get("proxy-logs")
  getProxy(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.getProxy(request));
  }

  @Delete("proxy-logs")
  deleteProxy(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.logs.deleteProxy(request));
  }
}
