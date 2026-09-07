import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { obsidianVaultSchema } from "./obsidian.schemas.js";
import { ObsidianSettingsService } from "./obsidian.service.js";

@Controller("api/settings/obsidian/webdav")
export class ObsidianWebdavController {
  constructor(private readonly obsidian: ObsidianSettingsService) {}
  private async authorize(request: FastifyRequest, reply: FastifyReply) { if (await isAuthenticated(toWebRequest(request))) return true; reply.status(401).send({ error: { message: "Authentication required" } }); return false; }

  @Get()
  async status(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      const status = await this.obsidian.getWebdavStatus();
      const hasManagement = (await requireManagementAuth(toWebRequest(request), { alwaysRequireAuth: true })) === null;
      return reply.send({ webdavEnabled: status.webdavEnabled, webdavUsername: status.webdavEnabled ? status.webdavUsername : null, webdavPassword: status.webdavEnabled && hasManagement ? status.webdavPassword : null, webdavPasswordSet: status.webdavEnabled && Boolean(status.webdavPassword), vaultPath: status.vaultPath });
    } catch (error) { return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } }); }
  }

  @Post()
  async enable(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(obsidianVaultSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: { message: "Missing or invalid vaultPath" } });
    const result = await this.obsidian.enableWebdav(validation.data.vaultPath);
    return result.success ? reply.send({ username: result.username, password: result.password, vaultPath: result.vaultPath }) : reply.status(400).send({ error: { message: result.error } });
  }

  @Delete()
  async disable(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { if (!(await this.authorize(request, reply))) return; const result = await this.obsidian.disableWebdav(); return result.success ? reply.send({ success: true }) : reply.status(500).send({ error: { message: result.error ?? "Failed to disable WebDAV sync" } }); }
}
