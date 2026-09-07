import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { getDocs, getCodexCli, getOpenApiSpec, postOpenApiTry } from "./handlers/index.js";

@Controller()
export class DocsController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}
  @Get("api/docs") get(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => getDocs()); }
  @Get("api/docs/codex-cli") codex(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => getCodexCli()); }
  @Get("api/openapi/spec") spec(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => getOpenApiSpec()); }
  @Post("api/openapi/try") tryIt(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => postOpenApiTry(request)); }
}
