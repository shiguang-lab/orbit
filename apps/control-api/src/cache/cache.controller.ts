import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Controller, Delete, Get, Inject, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CacheService } from "./cache.service.js";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";

@Controller("api/cache")
export class CacheController {
  constructor(@Inject(CacheService) private readonly cacheService: CacheService) {}

  @Get()
  async getOverview(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("trendHours") trendHours?: string
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const hours = trendHours ? parseInt(trendHours, 10) : 24;
      const result = await this.cacheService.getOverview(hours);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || String(error) });
    }
  }

  @Delete()
  async deleteCache(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("model") model?: string,
    @Query("signature") signature?: string,
    @Query("staleMs") staleMsParam?: string
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const paramCount = [model, signature, staleMsParam].filter(Boolean).length;
    if (paramCount > 1) {
      return reply.status(400).send({
        error: "Only one invalidation parameter (model, signature, or staleMs) may be provided per request.",
      });
    }

    let staleMs: number | undefined;
    if (staleMsParam) {
      staleMs = parseInt(staleMsParam, 10);
      if (Number.isNaN(staleMs) || staleMs <= 0) {
        return reply.status(400).send({ error: "staleMs must be a positive integer (milliseconds)." });
      }
    }

    try {
      const result = await this.cacheService.deleteCache({ model, signature, staleMs });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || String(error) });
    }
  }

  @Get("entries")
  async getEntries(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("model") model?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const result = this.cacheService.listEntries({
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        search,
        model,
        sortBy,
        sortOrder,
      });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || String(error) });
    }
  }

  @Delete("entries")
  async deleteEntries(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("signature") signature?: string,
    @Query("model") model?: string
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    if (!signature && !model) {
      return reply.status(400).send({ error: "Provide signature or model parameter" });
    }

    try {
      const result = await this.cacheService.deleteEntry({ signature, model });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || String(error) });
    }
  }

  @Get("reasoning")
  async getReasoning(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("provider") provider?: string,
    @Query("model") model?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const result = await this.cacheService.getReasoning({
        provider,
        model,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || String(error) });
    }
  }

  @Delete("reasoning")
  async deleteReasoning(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("toolCallId") toolCallId?: string,
    @Query("provider") provider?: string
  ): Promise<unknown> {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const result = await this.cacheService.deleteReasoning({ toolCallId, provider });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || String(error) });
    }
  }

  @Get("stats")
  async getStats(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const result = await this.cacheService.getMemoryStats();
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || String(error) });
    }
  }

  @Delete("stats")
  async deleteStats(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const result = await this.cacheService.clearMemory();
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || String(error) });
    }
  }
}
