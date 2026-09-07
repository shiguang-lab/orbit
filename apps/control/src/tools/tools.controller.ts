import { Inject, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ToolsService } from "./tools.service.js";

@Controller("api/tools")
export class ToolsController {
  constructor(@Inject(ToolsService) private readonly service: ToolsService, @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Get("traffic-inspector/capture-modes")
  captureModes(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.captureModes());
  }

  @Get("traffic-inspector/hosts")
  listHosts(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.listHosts());
  }

  @Post("traffic-inspector/hosts")
  createHost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.service.createHost(r));
  }

  @Get("traffic-inspector/requests")
  listRequests(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.service.listRequests(r));
  }

  @Delete("traffic-inspector/requests")
  clearRequests(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.clearRequests());
  }

  @Get("traffic-inspector/sessions")
  listSessions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.service.listSessions());
  }

  @Post("traffic-inspector/sessions")
  createSession(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.service.createSession(r));
  }
}
