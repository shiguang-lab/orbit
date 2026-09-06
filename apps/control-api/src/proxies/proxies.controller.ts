import {
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProxiesService } from "./proxies.service.js";

@Controller("api/settings/proxies")
export class ProxiesController {
  constructor(
    @Inject(ProxiesService) private readonly proxies: ProxiesService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Get()
  list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.list(req));
  }

  @Post()
  create(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.create(req));
  }

  @Patch()
  update(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.update(req));
  }

  @Delete()
  remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.remove(req));
  }

  @Get("assignments")
  assignments(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.assignments(req));
  }

  @Put("assignments")
  updateAssignment(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.updateAssignment(req));
  }

  @Get("health")
  health(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.health(req));
  }

  @Get("pool")
  pool(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.pool(req));
  }

  @Put("pool")
  addPoolMember(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.addPoolMember(req));
  }

  @Delete("pool")
  removePoolMember(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.removePoolMember(req));
  }

  @Patch("pool")
  setPoolStrategy(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.setPoolStrategy(req));
  }

  @Put("bulk-assign")
  bulkAssign(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.bulkAssign(req));
  }

  @Post("bulk-import")
  bulkImport(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.bulkImport(req));
  }

  @Post("batch-activate")
  batchActivate(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.batchActivate(req));
  }

  @Post("batch-delete")
  batchDelete(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.batchDelete(req));
  }
}
