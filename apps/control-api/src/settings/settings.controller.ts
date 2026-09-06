import { Body, Controller, Get, Inject, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { SettingsService } from "./settings.service.js";

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
}
