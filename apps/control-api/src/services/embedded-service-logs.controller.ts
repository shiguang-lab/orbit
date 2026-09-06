import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { EmbeddedServiceLogsService } from "./embedded-service-logs.service.js";

@Controller("api/services/:name")
export class EmbeddedServiceLogsController {
  constructor(private readonly service: EmbeddedServiceLogsService, private readonly routes: WebRouteDispatcher) {}

  @Get("logs")
  logs(@Param("name") name: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.logs(name, webRequest));
  }
}
