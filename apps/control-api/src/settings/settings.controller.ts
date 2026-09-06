import { Body, Controller, Delete, Get, Inject, Patch, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { databaseSettingsSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { SettingsService } from "./settings.service.js";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import {
  FEATURE_FLAG_DEFINITIONS,
} from "@shiguang-gateway/core-domain/control/feature-flags";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

const databaseSettingsPatchSchema = databaseSettingsSchema.partial().strict();

const updateSystemPromptSchema = z
  .object({
    prompt: z.string().max(50000).optional(),
    prefixPrompt: z.string().max(50000).optional(),
    suffixPrompt: z.string().max(50000).optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.prompt !== undefined ||
      value.prefixPrompt !== undefined ||
      value.suffixPrompt !== undefined ||
      value.enabled !== undefined,
    { message: "No valid fields to update" },
  );

const updateThinkingBudgetSchema = z
  .object({
    mode: z.enum(["passthrough", "auto", "custom", "adaptive"]).optional(),
    customBudget: z.coerce.number().int().min(0).max(131072).optional(),
    effortLevel: z.enum(["none", "low", "medium", "high", "xhigh", "max"]).optional(),
    baseBudget: z.coerce.number().int().min(0).max(131072).optional(),
    complexityMultiplier: z.coerce.number().min(0).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.mode !== undefined ||
      value.customBudget !== undefined ||
      value.effortLevel !== undefined ||
      value.baseBudget !== undefined ||
      value.complexityMultiplier !== undefined,
    { message: "No valid fields to update" },
  );

const updateFeatureFlagSchema = z.object({
  key: z.string().min(1),
  value: z.string().optional(),
});

/** HTTP transport for model runtime settings owned by control-api. */
@Controller("api/settings")
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  private async authorizeAuthenticated(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<boolean> {
    if (await isAuthenticated(request.raw as unknown as Request)) return true;
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }

  @Get("system-prompt")
  async getSystemPrompt(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(this.settings.getSystemPrompt());
    } catch (error) {
      console.error("Error reading system prompt config:", error);
      return reply.status(500).send({ error: "Failed to read system prompt config" });
    }
  }

  @Put("system-prompt")
  async updateSystemPrompt(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(updateSystemPromptSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      return reply.send(await this.settings.updateSystemPrompt(validation.data));
    } catch (error) {
      console.error("Error updating system prompt config:", error);
      return reply.status(500).send({ error: "Failed to update system prompt config" });
    }
  }

  @Get("thinking-budget")
  async getThinkingBudget(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(this.settings.getThinkingBudget());
    } catch (error) {
      console.error("Error reading thinking budget config:", error);
      return reply.status(500).send({ error: "Failed to read thinking budget config" });
    }
  }

  @Put("thinking-budget")
  async updateThinkingBudget(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(updateThinkingBudgetSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      return reply.send(await this.settings.updateThinkingBudget(validation.data));
    } catch (error) {
      console.error("Error updating thinking budget config:", error);
      return reply.status(500).send({ error: "Failed to update thinking budget config" });
    }
  }

  @Get("database")
  async getDatabaseSettings(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    try {
      return reply.send(this.settings.getDatabaseSettings());
    } catch (error) {
      console.error("Error getting database settings:", error);
      return reply.status(500).send({ error: "Failed to load database settings" });
    }
  }

  @Patch("database")
  async patchDatabaseSettings(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    const validation = validateBody(databaseSettingsPatchSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      return reply.send(this.settings.getDatabaseSettingsAfterUpdate(validation.data));
    } catch (error) {
      console.error("Error updating database settings:", error);
      return reply.status(500).send({ error: "Failed to update database settings" });
    }
  }

  @Put("database")
  async putDatabaseSettings(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    return this.patchDatabaseSettings(request, reply, body);
  }

  @Get("database/vacuum")
  async getVacuumState(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    return reply.send({ state: this.settings.getVacuumState() });
  }

  @Post("database/vacuum")
  async runVacuum(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    try {
      const result = await this.settings.runVacuum();
      if (result.success) {
        return reply.send({
          success: true,
          message: `VACUUM completed in ${result.durationMs}ms`,
          duration: result.durationMs,
        });
      }
      if (result.error === "already_running") {
        return reply.status(409).send({ success: false, error: "A vacuum is already in progress" });
      }
      return reply.status(500).send({
        success: false,
        error: result.error || "VACUUM failed",
        duration: result.durationMs,
      });
    } catch (error) {
      console.error("[API] VACUUM endpoint error:", error);
      return reply.status(500).send({
        error: "Failed to run VACUUM",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @Post("database/refresh-stats")
  async refreshDatabaseStats(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    try {
      return reply.send({ success: true, stats: this.settings.getDatabaseStats() });
    } catch (error) {
      console.error("Failed to refresh database stats:", error);
      return reply.status(500).send({ error: "Failed to refresh database stats" });
    }
  }

  @Get("feature-flags")
  async getFeatureFlags(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    try {
      return reply.send(this.settings.getFeatureFlags());
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Put("feature-flags")
  async updateFeatureFlag(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    const validation = validateBody(updateFeatureFlagSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });

    const { key, value } = validation.data;
    const definition = FEATURE_FLAG_DEFINITIONS.find((item) => item.key === key);
    if (!definition) return reply.status(400).send({ error: `Unknown feature flag key: ${key}` });
    if (value !== undefined && definition.type === "enum" && definition.enumValues) {
      if (!definition.enumValues.includes(value)) {
        return reply.status(400).send({
          error: `Invalid value "${value}" for enum flag ${key}. Allowed: ${definition.enumValues.join(", ")}`,
        });
      }
    }

    try {
      return reply.send(this.settings.updateFeatureFlag(key, value));
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Delete("feature-flags")
  async clearFeatureFlags(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    try {
      return reply.send(this.settings.clearFeatureFlagOverrides());
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }
}
