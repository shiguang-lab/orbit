import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Delete, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@orbit/core/shared/validation/helpers";
import {
  addModelAliasSchema,
  removeModelAliasSchema,
  updateModelAliasesSchema,
} from "./model-aliases.schemas.js";
import { ModelAliasesService } from "./model-aliases.service.js";

/** HTTP transport for model alias settings owned by control. */
@Controller("api/settings/model-aliases")
export class ModelAliasesController {
  constructor(private readonly aliases: ModelAliasesService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.aliases.getAliases());
    } catch (error) {
      console.error("[API ERROR] /api/settings/model-aliases GET:", error);
      return reply.status(500).send({ error: "Failed to get model aliases" });
    }
  }

  @Put()
  async replace(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(updateModelAliasesSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      return reply.send(await this.aliases.replaceAliases(validation.data.aliases));
    } catch (error) {
      console.error("[API ERROR] /api/settings/model-aliases PUT:", error);
      return reply.status(500).send({ error: "Failed to update model aliases" });
    }
  }

  @Post()
  async add(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(addModelAliasSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      return reply.send(await this.aliases.addAlias(validation.data.from, validation.data.to));
    } catch (error) {
      console.error("[API ERROR] /api/settings/model-aliases POST:", error);
      return reply.status(500).send({ error: "Failed to add alias" });
    }
  }

  @Delete()
  async remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(removeModelAliasSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      const result = await this.aliases.removeAlias(validation.data.from);
      if (!result) return reply.status(404).send({ error: "Alias not found" });
      return reply.send(result);
    } catch (error) {
      console.error("[API ERROR] /api/settings/model-aliases DELETE:", error);
      return reply.status(500).send({ error: "Failed to remove alias" });
    }
  }
}
