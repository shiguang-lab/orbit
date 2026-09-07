import { toWebRequest } from "@orbit/http/web-handler";
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Param,
  Post,
  Put,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProxiesService, type ProxyOperationResult } from "./proxies.service.js";

@Controller("api/settings/proxies")
export class ProxiesController {
  constructor(
    @Inject(ProxiesService) private readonly proxies: ProxiesService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  private sendOperation(reply: FastifyReply, result: ProxyOperationResult) {
    return reply.status(result.status).send(result.body);
  }

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

  @Post("auto-test")
  async autoTest(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    return this.sendOperation(reply, await this.proxies.autoTest(body));
  }

  @Get("egress")
  async diagnoseEgress(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return this.sendOperation(reply, await this.proxies.diagnoseEgress());
  }

  @Post("egress")
  async validateEgress(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return this.sendOperation(reply, await this.proxies.validateEgress());
  }

  @Post("migrate")
  async migrate(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    return this.sendOperation(reply, await this.proxies.migrateLegacy(body));
  }

  @Post(":id/repair-relay")
  async repairRelay(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string,
  ) {
    if (!(await this.authorize(request, reply))) return;
    return this.sendOperation(reply, await this.proxies.repairRelay(id));
  }
}
