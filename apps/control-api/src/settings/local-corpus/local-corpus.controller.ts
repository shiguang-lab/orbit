import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { localCorpusSchema } from "./local-corpus.schemas.js";
import { LocalCorpusService } from "./local-corpus.service.js";

/** HTTP transport for the operator-managed local corpus source. */
@Controller("api/settings/local-corpus")
export class LocalCorpusController {
  constructor(private readonly localCorpus: LocalCorpusService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if (await isAuthenticated(request.raw as unknown as Request)) return true;
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(this.localCorpus.getConfig());
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Post()
  async configure(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(localCorpusSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({
        error: "Missing or invalid rootPath",
        details: "details" in validation.error ? validation.error.details : [],
      });
    }
    try {
      return reply.send(await this.localCorpus.configure(validation.data.rootPath));
    } catch (error) {
      return reply.status(400).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Delete()
  async disconnect(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(this.localCorpus.disconnect());
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }
}
