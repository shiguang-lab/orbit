import { Controller, Delete, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VncSessionService } from "./vnc-session.service.js";

@Controller(["api/vnc-session", "vnc-session"])
export class VncSessionController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(VncSessionService) private readonly service: VncSessionService,
  ) {}

  private async auth(request: Request): Promise<Response | null> {
    return requireManagementAuth(request);
  }

  @Get()
  async catalog(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => (await this.auth(r)) ?? this.service.handleCatalog());
  }

  @Get("*")
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const [connectionId, sessionId] = this.segments(request);
    return this.routes.dispatch(request, reply, async (r) => (await this.auth(r)) ?? this.service.handleGet(connectionId ?? "", sessionId));
  }

  @Post("*")
  async post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const [connectionId, second, action] = this.segments(request);
    return this.routes.dispatch(request, reply, async (r) => (await this.auth(r)) ?? this.service.handlePost(connectionId ?? "", second, action));
  }

  @Delete("*")
  async remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const [connectionId, sessionId] = this.segments(request);
    return this.routes.dispatch(request, reply, async (r) => (await this.auth(r)) ?? this.service.handleDelete(connectionId, sessionId));
  }

  private segments(request: FastifyRequest): string[] {
    const raw = (request.params as Record<string, unknown> | undefined)?.["*"] ?? "";
    return String(raw).split("/").filter(Boolean).map(decodeURIComponent);
  }
}
