import { Body, Controller, Get, Inject, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import {
  MemorySettingsExtendedSchema,
} from "@shiguang-gateway/core-domain/shared/validation/schemas";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { MemoryService } from "./memory.service.js";

/** HTTP transport for dashboard memory settings. */
@Controller("api/settings/memory")
export class MemoryController {
  constructor(@Inject(MemoryService) private readonly memory: MemoryService) {}

  @Get()
  async get(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await isAuthenticated(req.raw as unknown as Request))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

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
    if (!(await isAuthenticated(req.raw as unknown as Request))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const validation = validateBody(MemorySettingsExtendedSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }

    try {
      return reply.send(await this.memory.updateSettings(validation.data));
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }
}
