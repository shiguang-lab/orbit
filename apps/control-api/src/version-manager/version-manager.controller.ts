import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import {
  versionManagerInstallSchema,
  versionManagerToolSchema,
} from "@shiguang-gateway/core-domain/validation/misc";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { VersionManagerService } from "./version-manager.service.js";

@Controller("api/version-manager")
export class VersionManagerController {
  constructor(private readonly versionManager: VersionManagerService) {}

  @Get("status")
  async status(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(req, reply))) return;
    try {
      return reply.send(await this.versionManager.status());
    } catch (error) {
      return this.sendError(reply, error, "Failed to get status");
    }
  }

  @Get("check-update")
  async checkUpdate(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("tool") tool?: string,
  ) {
    if (!(await this.authorize(req, reply))) return;
    const selectedTool = tool ?? "cliproxy";
    if (!this.versionManager.isSupportedTool(selectedTool)) {
      return reply.status(400).send({ error: `Unknown tool: ${selectedTool}` });
    }
    try {
      return reply.send(await this.versionManager.checkUpdate());
    } catch (error) {
      return this.sendError(reply, error, "Failed to check for updates");
    }
  }

  @Post("install")
  async install(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(req, reply))) return;
    const validation = validateBody(versionManagerInstallSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    try {
      const result = await this.versionManager.install(validation.data.version);
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      const status = typeof error?.httpStatus === "number" ? error.httpStatus : 500;
      const message = error?.friendly || sanitizeErrorMessage(error);
      return reply.status(status).send({ error: message });
    }
  }

  @Post("start")
  async start(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    return this.runToolAction(req, reply, body, () => this.versionManager.start());
  }

  @Post("stop")
  async stop(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    return this.runToolAction(req, reply, body, () => this.versionManager.stop());
  }

  @Post("restart")
  async restart(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    return this.runToolAction(req, reply, body, () => this.versionManager.restart());
  }

  private async runToolAction(
    req: FastifyRequest,
    reply: FastifyReply,
    body: unknown,
    action: () => Promise<unknown>,
  ) {
    if (!(await this.authorize(req, reply))) return;
    const validation = validateBody(versionManagerToolSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    if (!this.versionManager.isSupportedTool(validation.data.tool)) {
      return reply.status(400).send({ error: `Unknown tool: ${validation.data.tool}` });
    }
    try {
      return reply.send(await action());
    } catch (error: any) {
      const status = typeof error?.statusCode === "number" ? error.statusCode : 500;
      return reply.status(status).send({ error: sanitizeErrorMessage(error) });
    }
  }

  private async authorize(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const error = await requireManagementAuth(req.raw as unknown as Request);
    if (!error) return true;
    reply.status(error.status).send(await error.json());
    return false;
  }

  private sendError(reply: FastifyReply, error: unknown, fallback: string) {
    const message = sanitizeErrorMessage(error) || fallback;
    console.error(`[version-manager] ${fallback}:`, message);
    return reply.status(500).send({ error: message });
  }
}
