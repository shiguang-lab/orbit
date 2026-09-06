import { Body, Controller, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { QdrantService } from "./qdrant.service.js";
import { qdrantSearchSchema, qdrantSettingsUpdateSchema } from "./qdrant.schemas.js";

/** HTTP transport for operator-managed Qdrant settings and diagnostics. */
@Controller("api/settings/qdrant")
export class QdrantController {
  constructor(private readonly qdrant: QdrantService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if (await isAuthenticated(request.raw as unknown as Request)) return true;
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }

  @Get()
  async getSettings(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.qdrant.getSettings());
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Put()
  async updateSettings(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(qdrantSettingsUpdateSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send(validation.error);
    try {
      return reply.send(await this.qdrant.updateSettings(validation.data));
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Get("health")
  async health(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.qdrant.health());
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Post("search")
  async search(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(qdrantSearchSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send(validation.error);
    try {
      return reply.send(await this.qdrant.search(validation.data.query, validation.data.topK));
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Post("cleanup")
  async cleanup(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.qdrant.cleanup());
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) } });
    }
  }

  @Get("embedding-models")
  async embeddingModels(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.qdrant.embeddingModels());
    } catch (error) {
      return reply.status(500).send({ error: { message: sanitizeErrorMessage(error) }, models: [] });
    }
  }
}

