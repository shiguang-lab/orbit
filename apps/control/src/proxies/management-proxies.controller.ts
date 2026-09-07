import { Controller, Delete, Get, Patch, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProxiesService } from "./proxies.service.js";

/** v1 management proxy registry and assignment endpoints. */
@Controller("api/v1/management/proxies")
export class ManagementProxiesController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: ProxiesService,
  ) {}

  @Get()
  list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.managementList(req));
  }

  @Post()
  create(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.managementCreate(req));
  }

  @Patch()
  update(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.managementUpdate(req));
  }

  @Delete()
  remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.managementRemove(req));
  }

  @Get("assignments")
  assignments(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.managementAssignments(req));
  }

  @Put("assignments")
  updateAssignment(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.managementUpdateAssignment(req));
  }

  @Put("bulk-assign")
  bulkAssign(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.managementBulkAssign(req));
  }

}
