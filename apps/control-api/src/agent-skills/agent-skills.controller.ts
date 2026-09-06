import { Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { AgentSkillsService } from "./agent-skills.service.js";

@Controller("api/agent-skills")
export class AgentSkillsController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly skills: AgentSkillsService) {}

  @Get()
  list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.list(request));
  }

  @Get("coverage")
  coverage(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.skills.coverage());
  }

  @Get(":id/raw")
  raw(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.skills.raw(id), { id });
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.skills.get(id), { id });
  }

  @Post("generate")
  generate(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.skills.generate(request));
  }
}
