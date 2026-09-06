import { Body, Controller, Get, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import {
  compressionSettingsUpdateSchema,
  mcpAccessibilityConfigSchema,
} from "@shiguang-gateway/core-domain/shared/validation/compression-config-schemas";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { CompressionSettingsService } from "./compression.service.js";

/** HTTP transport for persisted compression configuration owned by control-api. */
@Controller("api/settings/compression")
export class SettingsCompressionController {
  constructor(private readonly compression: CompressionSettingsService) {}

  @Get()
  async getSettings(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(request.raw as unknown as Request))) {
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
    if (!(await isAuthenticated(request.raw as unknown as Request))) {
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
    if (!(await isAuthenticated(request.raw as unknown as Request))) {
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
    if (!(await isAuthenticated(request.raw as unknown as Request))) {
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
    if (!(await isAuthenticated(request.raw as unknown as Request))) {
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
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (authError) {
      return reply.status(authError.status).send(await authError.json());
    }
    return reply.send(this.compression.getRules());
  }
}
