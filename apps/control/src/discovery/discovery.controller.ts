import { Controller, Delete, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { DiscoveryService } from "./discovery.service.js";

/** Local-only management operations for provider endpoint discovery. */
@Controller("api/discovery")
export class DiscoveryController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: DiscoveryService,
  ) {}

  @Get("results")
  list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.list(req));
  }

  @Get("results/:id")
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(request, reply, (req) => this.service.get(req, id), { id });
  }

  @Delete("results/:id")
  remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(request, reply, (req) => this.service.remove(req, id), { id });
  }

  @Post("scan")
  scan(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.scan(req));
  }

  @Post("verify/:id")
  verify(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(request, reply, (req) => this.service.verify(req, id), { id });
  }
}

