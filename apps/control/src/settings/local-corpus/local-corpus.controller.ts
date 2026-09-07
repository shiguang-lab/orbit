import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import {
  isValidationFailure,
  validateBody,
} from "@orbit/core/shared/validation/helpers";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { localCorpusSchema } from "./local-corpus.schemas.js";
import { LocalCorpusService } from "./local-corpus.service.js";

/** HTTP transport for the operator-managed local corpus source. */
@Controller("api/settings/local-corpus")
export class LocalCorpusController {
  constructor(private readonly localCorpus: LocalCorpusService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if (await isAuthenticated(toWebRequest(request))) return true;
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
