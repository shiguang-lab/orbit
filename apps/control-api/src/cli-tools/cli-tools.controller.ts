import { Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CliToolsService } from "./cli-tools.service.js";

@Controller("api/cli-tools")
export class CliToolsController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly cliTools: CliToolsService) {}

  @Get("deepseek-tui-settings")
  deepseekTuiGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.deepseekTuiGet(request));
  }
  @Post("deepseek-tui-settings")
  deepseekTuiPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.deepseekTuiPost(request));
  }
  @Delete("deepseek-tui-settings")
  deepseekTuiDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.deepseekTuiDelete(request));
  }

  @Get("forge-settings")
  forgeGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.forgeGet(request));
  }
  @Post("forge-settings")
  forgePost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.forgePost(request));
  }
  @Delete("forge-settings")
  forgeDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.forgeDelete(request));
  }

  @Get("pi-settings")
  piGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.piGet(request));
  }
  @Post("pi-settings")
  piPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.piPost(request));
  }
  @Delete("pi-settings")
  piDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.piDelete(request));
  }
}
