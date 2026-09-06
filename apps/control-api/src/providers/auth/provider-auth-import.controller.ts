import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { ProviderAuthImportService } from "./provider-auth-import.service.js";

@Controller("api/providers")
export class ProviderAuthImportController {
  constructor(private readonly providerAuth: ProviderAuthImportService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Post("claude-auth/import")
  async importClaude(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.importClaude(request.raw as unknown as Request, body);
    return reply.status(response.status).send(response.body);
  }

  @Post("claude-auth/import-bulk")
  async importClaudeBulk(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.importBulk("claude", request.raw as unknown as Request, body);
    return reply.status(response.status).send(response.body);
  }

  @Post("claude-auth/zip-extract")
  async extractClaude(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.extractZip("claude", request);
    return reply.status(response.status).send(response.body);
  }

  @Post("codex-auth/import")
  async importCodex(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.importCodex(request.raw as unknown as Request, body);
    return reply.status(response.status).send(response.body);
  }

  @Post("codex-auth/import-bulk")
  async importCodexBulk(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.importBulk("codex", request.raw as unknown as Request, body);
    return reply.status(response.status).send(response.body);
  }

  @Post("codex-auth/zip-extract")
  async extractCodex(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.extractZip("codex", request);
    return reply.status(response.status).send(response.body);
  }

  @Post("agy-auth/import")
  async importAgy(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.importAgy(request.raw as unknown as Request, body);
    return reply.status(response.status).send(response.body);
  }

  @Post("agy-auth/apply-local")
  async applyLocalAgy(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.applyLocalAgy(request.raw as unknown as Request, body);
    return reply.status(response.status).send(response.body);
  }

  @Post("agy-auth/import-bulk")
  async importAgyBulk(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.importBulk("agy", request.raw as unknown as Request, body);
    return reply.status(response.status).send(response.body);
  }

  @Post("agy-auth/zip-extract")
  async extractAgy(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    const response = await this.providerAuth.extractZip("agy", request);
    return reply.status(response.status).send(response.body);
  }
}
