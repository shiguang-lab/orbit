import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Delete, Get, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { CacheSettingsService } from "./cache-settings.service.js";

const cacheConfigUpdateSchema = z
  .object({
    semanticCacheEnabled: z.boolean().optional(),
    semanticCacheMaxSize: z.number().positive().optional(),
    semanticCacheTTL: z.number().positive().optional(),
    promptCacheEnabled: z.boolean().optional(),
    promptCacheStrategy: z.enum(["auto", "system-only", "manual"]).optional(),
    alwaysPreserveClientCache: z.enum(["auto", "always", "never"]).optional(),
    idempotencyWindowMs: z.number().positive().optional(),
    modelCatalogCacheTtlMs: z.number().positive().optional(),
  })
  .strict();

@Controller("api/settings")
export class CacheSettingsController {
  constructor(private readonly cacheSettings: CacheSettingsService) {}

  @Get("cache-config")
  async getCacheConfig(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      return reply.send(await this.cacheSettings.getConfig());
    } catch (error) {
      return reply.status(500).send({ error: String(error) });
    }
  }

  @Put("cache-config")
  async updateCacheConfig(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    let rawBody: unknown;
    try {
      rawBody = body;
    } catch {
      return reply.status(400).send({ error: "Invalid JSON body" });
    }
    const validation = validateBody(cacheConfigUpdateSchema, rawBody);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      await this.cacheSettings.updateConfig(validation.data);
      return reply.send({ ok: true });
    } catch (error) {
      return reply.status(500).send({ error: String(error) });
    }
  }

  @Get("cache-metrics")
  async getCacheMetrics(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeManagement(request, reply))) return;
    try {
      return reply.send(await this.cacheSettings.getMetrics());
    } catch (error) {
      console.error("Error getting cache metrics:", error);
      return reply.status(500).send({ error: "Failed to load cache metrics" });
    }
  }

  @Delete("cache-metrics")
  async resetCacheMetrics(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeManagement(request, reply))) return;
    try {
      return reply.send(await this.cacheSettings.resetMetrics());
    } catch (error) {
      console.error("Error resetting cache metrics:", error);
      return reply.status(500).send({ error: "Failed to reset cache metrics" });
    }
  }

  @Delete("lkgp-cache")
  async clearLkgp(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      this.cacheSettings.clearLkgp();
      return reply.send({ cleared: true });
    } catch (error) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async authorizeManagement(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }
}
