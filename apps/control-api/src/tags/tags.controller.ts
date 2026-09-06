import { Controller, Get, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { TagsService } from "./tags.service.js";

@Controller("api/tags")
export class TagsController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly tags: TagsService) {}

  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.tags.options());
  }

  @Get()
  list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.tags.list());
  }
}
