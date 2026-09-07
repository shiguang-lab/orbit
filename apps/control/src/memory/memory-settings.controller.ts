import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Get, Inject, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { MemorySettingsSchema } from "./memory.schemas.js";
import { MemoryService } from "./memory.service.js";

/** Persistent memory configuration is a control-plane settings resource. */
@Controller("api/settings/memory")
export class MemorySettingsController {
  constructor(@Inject(MemoryService) private readonly memory: MemoryService) {}

  @Get()
  async get(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    try {
      return reply.send(await this.memory.getSettings());
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Put()
  async update(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    const validation = validateBody(MemorySettingsSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      return reply.send(await this.memory.updateSettings(validation.data));
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  private async authorize(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const error = await requireManagementAuth(toWebRequest(req));
    if (!error) return true;
    reply.status(error.status).send(await error.json());
    return false;
  }
}
