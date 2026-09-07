import { Controller, Get, Inject, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CloudService } from "./cloud.service.js";

@Controller("api/cloud")
export class CloudController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(CloudService) private readonly cloud: CloudService,
  ) {}

  @Post("auth")
  auth(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.cloud.auth(req)); }
  @Put("credentials/update")
  updateCredentials(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.cloud.updateCredentials(req)); }
  @Post("model/resolve")
  resolveModel(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.cloud.resolveModel(req)); }
  @Get("models/alias")
  getAliases(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.cloud.getAliases(req)); }
  @Put("models/alias")
  updateAliases(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.cloud.updateAliases(req)); }
}
