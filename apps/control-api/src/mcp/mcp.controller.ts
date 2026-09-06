import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { McpService } from "./mcp.service.js";

@Controller("api/mcp")
export class McpController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: McpService) {}

  @Get("audit")
  audit(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.listAuditEntries(request));
  }

  @Get("audit/stats")
  auditStats(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.getAuditStatistics(request));
  }

  @Get("status")
  status(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.getStatus(request));
  }

  @Get("tools")
  tools(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.listTools(request));
  }
}
