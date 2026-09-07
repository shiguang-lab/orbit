import { Controller, Delete, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CliAccessService } from "./cli-access.service.js";

@Controller("api/cli")
export class CliAccessController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(CliAccessService) private readonly cli: CliAccessService,
  ) {}

  @Post("connect")
  connect(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cli.connectPost(request));
  }

  @Get("whoami")
  whoami(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cli.whoamiGet(request));
  }

  @Get("tokens")
  tokensGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cli.tokensGet(request));
  }

  @Post("tokens")
  tokensPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cli.tokensPost(request));
  }

  @Delete("tokens/:id")
  tokenDelete(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cli.tokenDelete(request, id), { id });
  }
}
