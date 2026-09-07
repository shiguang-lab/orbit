import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Delete, Get, Inject, Patch, Post, Req, Res, Query } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PricingService } from "./pricing.service.js";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  updatePricingSchema,
  pricingSyncRequestSchema,
  validateBody,
  isValidationFailure,
} from "@shiguang-gateway/core-domain/pricing/validation";

@Controller("api/pricing")
export class PricingController {
  constructor(@Inject(PricingService) private readonly pricingService: PricingService) {}

  @Get()
  async getPricing(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("includeSources") includeSources?: string
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const pricing = await this.pricingService.getPricing(includeSources === "1");
      return reply.send(pricing);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to fetch pricing" });
    }
  }

  @Patch()
  async patchPricing(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const validation = validateBody(updatePricingSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }

    try {
      const updated = await this.pricingService.updatePricing(validation.data as Record<string, any>);
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to update pricing" });
    }
  }

  @Delete()
  async deletePricing(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("provider") provider?: string,
    @Query("model") model?: string
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const pricing = await this.pricingService.resetPricing(provider, model);
      return reply.send(pricing);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to reset pricing" });
    }
  }

  @Get("defaults")
  async getDefaults(@Res() reply: FastifyReply): Promise<unknown> {
    try {
      const defaults = this.pricingService.getDefaultPricing();
      return reply.send(defaults);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to fetch default pricing" });
    }
  }

  @Get("models")
  async getModels(@Res() reply: FastifyReply): Promise<unknown> {
    try {
      const models = await this.pricingService.getModelsCatalog();
      return reply.send(models);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to fetch model catalog" });
    }
  }

  @Post("sync")
  async postSync(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const validation = validateBody(pricingSyncRequestSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    const { sources, dryRun = false } = validation.data as {
      sources?: "litellm"[];
      dryRun?: boolean;
    };

    try {
      const result = await this.pricingService.syncPricing(sources, dryRun);
      return reply.status(result.success ? 200 : 502).send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message || String(err) });
    }
  }

  @Get("sync")
  async getSync(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      return reply.send(this.pricingService.getSyncStatus());
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message || String(err) });
    }
  }

  @Delete("sync")
  async deleteSync(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const result = this.pricingService.clearSyncedPricing();
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message || String(err) });
    }
  }
}
