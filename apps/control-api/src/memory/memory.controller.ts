import { toWebRequest } from "@orbit/http/web-handler";
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { MemoryType } from "@orbit/core/memory/runtime";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import {
  CreateMemorySchema,
  ReindexSchema,
  RetrievePreviewSchema,
  SummarizeSchema,
  UpdateMemorySchema,
} from "./memory.schemas.js";
import { MemoryService } from "./memory.service.js";

/**
 * Control-plane memory administration.
 *
 * The memory engine is a shared, transport-neutral package capability; this
 * controller is the only HTTP registration surface for its management API.
 */
@Controller("api/memory")
export class MemoryController {
  constructor(@Inject(MemoryService) private readonly memory: MemoryService) {}

  @Get()
  async list(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("apiKeyId") apiKeyId?: string,
    @Query("type") type?: string,
    @Query("sessionId") sessionId?: string,
    @Query("q") query?: string,
    @Query("page") pageRaw?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;

    try {
      const page = this.parseInteger(pageRaw, 1);
      const limit = this.parseInteger(limitRaw, 50);
      const offset = offsetRaw === undefined ? undefined : this.parseInteger(offsetRaw, 0);
      const result = await this.memory.list({
        apiKeyId: apiKeyId || undefined,
        type: type ? (type as MemoryType) : undefined,
        sessionId: sessionId || undefined,
        query: query || undefined,
        limit,
        offset,
        page,
      });
      const responsePage = offset === undefined ? page : Math.floor(offset / limit) + 1;
      return reply.send({
        data: result.result.data,
        total: result.result.total,
        page: responsePage,
        limit,
        totalPages: Math.ceil(result.result.total / limit),
        stats: result.stats,
      });
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Post()
  async create(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    const validation = validateBody(CreateMemorySchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send(validation.error);

    try {
      const memory = await this.memory.create(validation.data);
      return reply.send({ success: true, id: memory.id });
    } catch (error) {
      return reply.status(400).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Get("health")
  async health(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    try {
      return reply.send(await this.memory.health());
    } catch (error) {
      return reply.status(500).send({
        working: false,
        latencyMs: 0,
        error: sanitizeErrorMessage(error),
      });
    }
  }

  @Post("retrieve-preview")
  async retrievePreview(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    const validation = validateBody(RetrievePreviewSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send(validation.error);
    try {
      const bundle = await this.memory.retrievePreview(
        validation.data.apiKeyId ?? null,
        validation.data.query,
        validation.data,
      );
      return reply.send({
        memories: bundle.items.map((item) => ({
          id: item.memory.id,
          type: item.memory.type,
          key: item.memory.key ?? "",
          content: item.memory.content,
          score: item.score,
          tokens: item.tokens,
          tier: item.tier,
          vecScore: item.vecScore,
          ftsScore: item.ftsScore,
        })),
        resolution: bundle.resolution,
        totalTokensUsed: bundle.totalTokens,
        budgetMaxTokens: bundle.budgetMaxTokens,
      });
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Get("embedding-providers")
  async embeddingProviders(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await this.authenticated(req, reply))) return;
    try {
      return reply.send({ providers: await this.memory.embeddingProviders() });
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Get("engine-status")
  async engineStatus(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await this.authenticated(req, reply))) return;
    try {
      return reply.send(await this.memory.engineStatus());
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Post("reindex")
  async reindex(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    const validation = validateBody(ReindexSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send(validation.error);
    try {
      return reply.send(await this.memory.reindex(validation.data.force));
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Post("summarize")
  async summarize(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    const validation = validateBody(SummarizeSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send(validation.error);
    try {
      return reply.send(await this.memory.summarize(
        validation.data.apiKeyId,
        validation.data.olderThanDays,
        validation.data.dryRun,
      ));
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Get(":id")
  async get(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    try {
      const memory = await this.memory.get(id);
      return memory ? reply.send({ memory }) : reply.status(404).send({ error: "Not found" });
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    const validation = validateBody(UpdateMemorySchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send(validation.error);
    try {
      if (!(await this.memory.get(id))) return reply.status(404).send({ error: { message: "Memory not found" } });
      await this.memory.update(id, validation.data);
      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<unknown> {
    if (!(await this.authorize(req, reply))) return;
    try {
      const success = await this.memory.delete(id);
      return success ? reply.send({ success: true }) : reply.status(404).send({ error: "Memory not found" });
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  private async authorize(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const error = await requireManagementAuth(toWebRequest(req));
    if (!error) return true;
    reply.status(error.status).send(await error.json());
    return false;
  }

  private async authenticated(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if (await isAuthenticated(toWebRequest(req))) return true;
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }

  private parseInteger(value: string | undefined, fallback: number): number {
    if (value === undefined || value.trim() === "") return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) throw new Error("Invalid pagination parameter");
    return Math.max(0, parsed);
  }
}
