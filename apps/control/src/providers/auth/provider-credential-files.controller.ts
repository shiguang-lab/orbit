import { Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { ProviderCredentialFilesService } from "./provider-credential-files.service.js";

@Controller("api/providers")
export class ProviderCredentialFilesController {
  constructor(
    private readonly files: ProviderCredentialFilesService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Post(":id/claude-auth/apply-local")
  applyClaude(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.files.applyClaude(request, id), { id });
  }

  @Post(":id/claude-auth/export")
  exportClaude(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.files.exportClaude(request, id), { id });
  }

  @Post(":id/codex-auth/apply-local")
  applyCodex(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.files.applyCodex(request, id), { id });
  }

  @Post(":id/codex-auth/export")
  exportCodex(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.files.exportCodex(request, id), { id });
  }
}
