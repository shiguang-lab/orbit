import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Get, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import {
  isValidationFailure,
  validateBody,
} from "@orbit/core/shared/validation/helpers";
import {
  compressionSettingsUpdateSchema,
  mcpAccessibilityConfigSchema,
} from "../../compression/compression-config-schemas.js";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { CompressionSettingsService } from "./compression.service.js";

/** HTTP transport for persisted compression configuration owned by control-api. */
@Controller("api/settings/compression")
export class SettingsCompressionController {
  constructor(private readonly compression: CompressionSettingsService) {}

  @Get()
  async getSettings(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      return reply.send(await this.compression.getSettings());
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Put()
  async updateSettings(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const validation = validateBody(compressionSettingsUpdateSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    try {
      return reply.send(await this.compression.updateSettings(validation.data));
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Get("mcp-accessibility")
  async getMcpAccessibility(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      return reply.send(await this.compression.getMcpAccessibility());
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Put("mcp-accessibility")
  async updateMcpAccessibility(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const validation = validateBody(mcpAccessibilityConfigSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    try {
      return reply.send(await this.compression.updateMcpAccessibility(validation.data));
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Get("run-telemetry")
  async getRunTelemetry(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return reply.send(this.compression.getRunTelemetry());
  }
}

/** Read-only management route under the historical settings path. */
@Controller("api/settings/compression")
export class CompressionRulesController {
  constructor(private readonly compression: CompressionSettingsService) {}

  @Get("rules")
  async getRules(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) {
      return reply.status(authError.status).send(await authError.json());
    }
    return reply.send(this.compression.getRules());
  }
}
