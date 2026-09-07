import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Get, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { rtkConfigSchema } from "../../compression/compression-config-schemas.js";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import {
  RTK_TOML_MAX_BYTES,
  RtkTomlCompatibilityError,
  type RtkTomlCompatibilityResult,
} from "@shiguang-gateway/open-sse/services/compression/engines/rtk/tomlCompatibility";
import { CompressionSettingsService } from "./compression.service.js";

const rtkTestSchema = z
  .object({
    text: z.string().min(1),
    command: z.string().optional(),
    config: rtkConfigSchema.optional(),
  })
  .strict();

const rtkImportSchema = z
  .object({
    action: z.enum(["validate", "install"]),
    content: z.string().min(1).max(RTK_TOML_MAX_BYTES),
    overwrite: z.boolean().optional(),
  })
  .strict();

function rtkImportResponse(
  result: RtkTomlCompatibilityResult & { installedPath?: string; backupCreated?: boolean },
) {
  return {
    schemaVersion: result.schemaVersion,
    sha256: result.sha256,
    passed: result.passed,
    filters: result.filters.map((filter) => ({
      id: filter.id,
      description: filter.description,
      category: filter.category,
      commandPatterns: filter.commandPatterns,
      testCount: filter.tests.length,
    })),
    outcomes: result.outcomes,
    filtersWithoutTests: result.filtersWithoutTests,
    warnings: result.warnings,
    installedPath: result.installedPath,
    backupCreated: result.backupCreated,
  };
}

/** Management transport for the RTK compression configuration and diagnostics. */
@Controller("api/context/rtk")
export class RtkController {
  constructor(private readonly compression: CompressionSettingsService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get("config")
  async getConfig(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return reply.send(await this.compression.getRtkConfig());
  }

  @Put("config")
  async updateConfig(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(rtkConfigSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    return reply.send(await this.compression.updateRtkConfig(validation.data));
  }

  @Get("discover")
  async discover(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("limit") limitParam?: string,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const value = Number(limitParam);
    const limit = !Number.isFinite(value) || value <= 0 ? 500 : Math.min(2000, Math.floor(value));
    return reply.send(this.compression.getRtkDiscover(limit));
  }

  @Get("filters")
  async filters(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return reply.send(this.compression.getRtkFilters());
  }

  @Get("learn")
  async learn(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("command") commandParam?: string,
    @Query("limit") limitParam?: string,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const command = (commandParam ?? "").trim();
    if (!command) {
      return reply.status(400).send({
        error: { message: "The 'command' query parameter is required.", type: "invalid_request" },
      });
    }
    const value = Number(limitParam);
    const limit = !Number.isFinite(value) || value <= 0 ? 500 : Math.min(2000, Math.floor(value));
    return reply.send(this.compression.getRtkLearn(command, limit));
  }

  @Post("test")
  async test(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(rtkTestSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    return reply.send(
      this.compression.testRtk(validation.data.text, validation.data.command, validation.data.config),
    );
  }

  @Get("raw-output/:id")
  async rawOutput(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    if (!(await this.authorize(request, reply))) return;
    if (!/^[a-f0-9]{24}$/.test(id)) {
      return reply.status(400).send({ error: "Invalid raw output id" });
    }
    const content = this.compression.readRtkRawOutput(id);
    if (content === null) return reply.status(404).send({ error: "Raw output not found" });
    return reply.type("text/plain; charset=utf-8").header("cache-control", "no-store").send(content);
  }

  @Post("import")
  async import(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(rtkImportSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send(buildErrorBody(400, "Invalid RTK TOML import request"));
    }
    try {
      const result = this.compression.importRtkToml(
        validation.data.action,
        validation.data.content,
        validation.data.overwrite,
      );
      return reply.send(rtkImportResponse(result));
    } catch (error) {
      if (error instanceof RtkTomlCompatibilityError) {
        return reply.status(400).send(buildErrorBody(400, error.publicMessage));
      }
      return reply
        .status(500)
        .send(buildErrorBody(500, "Failed to process RTK TOML filter import"));
    }
  }
}
