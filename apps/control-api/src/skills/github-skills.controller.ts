import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import * as githubSkills from "./handlers/github-skills.handler.js";

@Controller("api/github-skills")
export class GitHubSkillsController {
  constructor(private readonly routes: WebRouteDispatcher) {}

  @Get()
  list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, githubSkills.GET);
  }

  @Post()
  install(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, githubSkills.POST);
  }
}
