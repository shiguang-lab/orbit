import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { QuotaService } from "./quota.service.js";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  GroupCreateSchema,
  GroupRenameSchema,
  PlanUpsertSchema,
  PoolCreateSchema,
  PoolUpdateSchema,
  QuotaPreviewQuerySchema,
} from "./schemas.js";
import { logAuditEvent, getAuditRequestContext } from "@shiguang-gateway/core-domain/compliance";

const load = (specifier: string): Promise<any> => import(specifier as string);
const { buildErrorBody } = await load("@shiguang-gateway/open-sse/utils/error");

@Controller("api/quota")
export class QuotaController {
  constructor(@Inject(QuotaService) private readonly quotaService: QuotaService) {}

  @Get("groups")
  async getGroups(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const groups = this.quotaService.listGroups();
      return reply.send({ groups });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to list groups"));
    }
  }

  @Post("groups")
  async postGroups(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const parsed = GroupCreateSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send(buildErrorBody(400, parsed.error.message));
    }

    try {
      const group = this.quotaService.createGroup(parsed.data.name);
      return reply.status(201).send({ group });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to create group"));
    }
  }

  @Patch("groups/:id")
  async patchGroup(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const parsed = GroupRenameSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send(buildErrorBody(400, parsed.error.message));
    }

    try {
      const group = await this.quotaService.renameGroup(id, parsed.data.name);
      if (!group) return reply.status(404).send(buildErrorBody(404, "Group not found"));
      return reply.send({ group });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to rename group"));
    }
  }

  @Delete("groups/:id")
  async deleteGroup(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      let existed: boolean;
      try {
        existed = this.quotaService.deleteGroup(id);
      } catch (err: any) {
        return reply.status(409).send(buildErrorBody(409, err?.message || "Cannot delete group"));
      }

      if (!existed) return reply.status(404).send(buildErrorBody(404, "Group not found"));
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to delete group"));
    }
  }

  @Get("keys/:id/models")
  async getKeyModels(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const models = await this.quotaService.getKeyModels(id);
      if (!models) return reply.status(404).send(buildErrorBody(404, "API key not found"));
      return reply.send({ models });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to resolve key models"));
    }
  }

  @Get("plans")
  async getPlans(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const plans = this.quotaService.listPlans();
      return reply.send({ plans });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to list plans"));
    }
  }

  @Get("plans/:connectionId")
  async getPlan(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("connectionId") connectionId: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const plan = await this.quotaService.getPlan(connectionId);
      return reply.send({ plan });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to get plan"));
    }
  }

  @Put("plans/:connectionId")
  async putPlan(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("connectionId") connectionId: string,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const parsed = PlanUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send(buildErrorBody(400, parsed.error.message));
    }

    try {
      const { plan, provider } = await this.quotaService.upsertPlan(connectionId, parsed.data.dimensions);
      const ctx = getAuditRequestContext(rawReq);
      logAuditEvent({
        action: "quota.plan.updated",
        target: connectionId,
        metadata: { provider, dimensions: parsed.data.dimensions, source: "manual" },
        ipAddress: ctx.ipAddress ?? undefined,
        requestId: ctx.requestId,
      });

      return reply.send({ plan });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to upsert plan"));
    }
  }

  @Delete("plans/:connectionId")
  async deletePlan(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("connectionId") connectionId: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const { provider } = await this.quotaService.deletePlan(connectionId);
      const ctx = getAuditRequestContext(rawReq);
      logAuditEvent({
        action: "quota.plan.updated",
        target: connectionId,
        metadata: { provider, source: "auto", reverted: true },
        ipAddress: ctx.ipAddress ?? undefined,
        requestId: ctx.requestId,
      });

      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to delete plan"));
    }
  }

  @Get("pools")
  async getPools(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const parsedLimit = limit !== undefined ? Number(limit) : undefined;
      const parsedOffset = offset !== undefined ? Number(offset) : 0;
      const result = this.quotaService.listPools(parsedLimit, parsedOffset);
      return reply.send({ pools: result.items, total: result.total });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to list pools"));
    }
  }

  @Post("pools")
  async postPools(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
    @Query("ensure") ensure?: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const parsed = PoolCreateSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send(buildErrorBody(400, parsed.error.message));
    }

    try {
      const isEnsure = ensure === "true";
      const { pool, ensured } = this.quotaService.createPool(parsed.data, isEnsure);
      const ctx = getAuditRequestContext(rawReq);
      logAuditEvent({
        action: ensured?.updated ? "quota.pool.updated" : "quota.pool.created",
        target: pool.id,
        metadata: {
          connectionId: pool.connectionId,
          name: pool.name,
          ensure: isEnsure,
          created: ensured?.created ?? true,
          updated: ensured?.updated ?? false,
        },
        ipAddress: ctx.ipAddress ?? undefined,
        requestId: ctx.requestId,
      });

      const statusCode = ensured?.created === false ? 200 : 201;
      return reply.status(statusCode).send({ pool, ...(ensured ? { created: ensured.created, updated: ensured.updated } : {}) });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to create pool"));
    }
  }

  @Get("pools/:id")
  async getPool(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const pool = this.quotaService.getPool(id);
      if (!pool) return reply.status(404).send(buildErrorBody(404, "Pool not found"));
      return reply.send({ pool });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to get pool"));
    }
  }

  @Patch("pools/:id")
  async patchPool(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string,
    @Body() body: any
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const parsed = PoolUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send(buildErrorBody(400, parsed.error.message));
    }

    try {
      const exclusivePresent = body !== null && typeof body === "object" && "exclusive" in body;
      const combosNeedResync =
        body !== null && typeof body === "object" && ("connectionIds" in body || "groupId" in body);

      const pool = await this.quotaService.updatePool(id, parsed.data, exclusivePresent, combosNeedResync);
      if (!pool) return reply.status(404).send(buildErrorBody(404, "Pool not found"));

      const ctx = getAuditRequestContext(rawReq);
      logAuditEvent({
        action: "quota.pool.updated",
        target: id,
        metadata: parsed.data,
        ipAddress: ctx.ipAddress ?? undefined,
        requestId: ctx.requestId,
      });

      return reply.send({ pool });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to update pool"));
    }
  }

  @Delete("pools/:id")
  async deletePool(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const existed = await this.quotaService.deletePool(id);
      if (!existed) return reply.status(404).send(buildErrorBody(404, "Pool not found"));

      const ctx = getAuditRequestContext(rawReq);
      logAuditEvent({
        action: "quota.pool.deleted",
        target: id,
        ipAddress: ctx.ipAddress ?? undefined,
        requestId: ctx.requestId,
      });

      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to delete pool"));
    }
  }

  @Get("pools/:id/log")
  async getPoolLog(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string,
    @Query("limit") limit?: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const parsedLimit = limit !== undefined ? parseInt(limit, 10) : undefined;
      const events = this.quotaService.listPoolLog(id, parsedLimit);
      return reply.send({ events });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to get pool log"));
    }
  }

  @Get("pools/:id/usage")
  async getPoolUsage(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const usage = await this.quotaService.getPoolUsage(id);
      if (!usage) return reply.status(404).send(buildErrorBody(404, "Pool not found"));
      return reply.send({ usage });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to get pool usage"));
    }
  }

  @Get("preview")
  async getPreview(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("apiKeyId") apiKeyId?: string,
    @Query("poolId") poolId?: string,
    @Query("estimatedTokens") estimatedTokens?: string,
    @Query("estimatedUsd") estimatedUsd?: string,
    @Query("estimatedRequests") estimatedRequests?: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const parsed = QuotaPreviewQuerySchema.safeParse({
      apiKeyId,
      poolId,
      estimatedTokens: estimatedTokens !== undefined ? Number(estimatedTokens) : undefined,
      estimatedUsd: estimatedUsd !== undefined ? Number(estimatedUsd) : undefined,
      estimatedRequests: estimatedRequests !== undefined ? Number(estimatedRequests) : undefined,
    });

    if (!parsed.success) {
      return reply.status(400).send(buildErrorBody(400, parsed.error.message));
    }

    try {
      const decision = await this.quotaService.preview(parsed.data);
      if (!decision) return reply.status(404).send(buildErrorBody(404, "Pool not found"));
      return reply.send({ decision });
    } catch (err: any) {
      return reply.status(500).send(buildErrorBody(500, err?.message || "Failed to preview quota enforcement"));
    }
  }
}
