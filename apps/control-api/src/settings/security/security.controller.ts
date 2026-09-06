import { Body, Controller, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import {
  jsonObjectSchema,
  resetStatsActionSchema,
  updateAutoDisableAccountsSchema,
  updateIpFilterSchema,
  updatePayloadRulesSchema,
  updateRequireLoginSchema,
} from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { SettingsSecurityService } from "./security.service.js";

@Controller("api/settings")
export class SettingsSecurityController {
  constructor(private readonly security: SettingsSecurityService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get("auto-disable-accounts")
  async getAutoDisable(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try { return reply.send(await this.security.getAutoDisableAccounts()); }
    catch { return reply.status(500).send({ error: "Failed to read auto-disable accounts config" }); }
  }

  @Put("auto-disable-accounts")
  async updateAutoDisable(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(updateAutoDisableAccountsSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try { return reply.send(await this.security.updateAutoDisableAccounts(validation.data)); }
    catch { return reply.status(500).send({ error: "Failed to update auto-disable accounts config" }); }
  }

  @Get("background-degradation")
  async getBackground(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try { return reply.send(this.security.getBackgroundDegradation()); }
    catch { return reply.status(500).send({ error: "Failed to get config" }); }
  }

  @Put("background-degradation")
  async updateBackground(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(jsonObjectSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    const result = await this.security.updateBackgroundDegradation(validation.data);
    if (result.blocked) return reply.status(400).send({ error: { code: "PAID_MODEL_TARGET_BLOCKED", message: "This field cannot target a paid-only model while 'Hide paid models' is enabled." } });
    return reply.send({ success: true, ...result.config });
  }

  @Post("background-degradation")
  async resetBackground(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(resetStatsActionSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    if (validation.data.action !== "reset-stats") return reply.status(400).send({ error: "Unknown action" });
    return reply.send(this.security.resetBackgroundStats());
  }

  @Get("require-login")
  async getRequireLogin(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return reply.send(await this.security.getRequireLogin(request.raw as unknown as Request));
  }

  @Post("require-login")
  async updateRequireLogin(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    const validation = validateBody(updateRequireLoginSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    const result = await this.security.updateRequireLogin(request.raw as unknown as Request, validation.data);
    if (result.unauthorized) return reply.status(401).send({ error: "Unauthorized" });
    return reply.send({ success: true });
  }

  @Get("ip-filter")
  async getIpFilter(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try { return reply.send(this.security.getIpFilter()); }
    catch { return reply.status(500).send({ error: "Failed to get IP filter config" }); }
  }

  @Put("ip-filter")
  async updateIpFilter(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(updateIpFilterSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try { return reply.send(this.security.updateIpFilter(validation.data)); }
    catch { return reply.status(500).send({ error: "Failed to update IP filter config" }); }
  }

  @Get("payload-rules")
  async getPayloadRules(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try { return reply.send(await this.security.getPayloadRules()); }
    catch { return reply.status(500).send({ error: "Failed to read payload rules config" }); }
  }

  @Put("payload-rules")
  async updatePayloadRules(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(updatePayloadRulesSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try { return reply.send(await this.security.updatePayloadRules(validation.data)); }
    catch { return reply.status(500).send({ error: "Failed to update payload rules config" }); }
  }

  @Get("authz-inventory")
  async getAuthzInventory(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const result = await this.security.getAuthzInventory(request.raw as unknown as Request);
    if (result.error) {
      return reply.status(result.error.status).send(result.error.body);
    }
    return reply.send(result);
  }
}
