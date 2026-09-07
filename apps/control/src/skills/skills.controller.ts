import { Controller, Delete, Get, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { SkillsService } from "./skills.service.js";
import * as executions from "./handlers/executions.handler.js";

@Controller("api/skills")
export class SkillsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(SkillsService) private readonly skills: SkillsService,
  ) {}

  @Get()
  list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.list(request));
  }

  @Post("install")
  install(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.install(request));
  }

  @Put(":id")
  update(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.update(request, id), { id });
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.remove(request, id), { id });
  }

  @Get("marketplace")
  marketplace(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.marketplace(request));
  }

  @Post("marketplace/install")
  marketplaceInstall(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.marketplaceInstall(request));
  }

  @Get("skillssh")
  skillssh(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.skillssh(request));
  }

  @Post("skillssh/install")
  skillsshInstall(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.skillsshInstall(request));
  }

  @Get("collect/detect")
  collectDetect(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.collectDetect(request));
  }

  @Post("collect/install")
  collectInstall(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.collectInstall(request));
  }

  @Get("executions")
  executions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, executions.GET);
  }

  @Post("executions")
  execute(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, executions.POST);
  }

}
