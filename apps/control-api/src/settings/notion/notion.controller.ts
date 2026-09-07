import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { notionTokenSchema } from "./notion.schemas.js";
import { NotionSettingsService } from "./notion.service.js";

@Controller("api/settings/notion")
export class NotionSettingsController {
  constructor(private readonly notion: NotionSettingsService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply) {
    if (await isAuthenticated(toWebRequest(request))) return true;
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try { return reply.send(this.notion.getSettings()); }
    catch (error) { return reply.status(500).send({ error: sanitizeErrorMessage(error) }); }
  }

  @Post()
  async connect(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(notionTokenSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: "Missing or invalid token", details: validation.error });
    const result = await this.notion.connect(validation.data.token);
    return result.status === 200 ? reply.send(result.body) : reply.status(result.status).send({ ...result.body, error: sanitizeErrorMessage(result.body.error) });
  }

  @Delete()
  async disconnect(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try { return reply.send(this.notion.disconnect()); }
    catch (error) { return reply.status(500).send({ error: sanitizeErrorMessage(error) }); }
  }
}
