import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Get, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { compressionSettingsUpdateSchema } from "../../compression/compression-config-schemas.js";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { CompressionSettingsService } from "./compression.service.js";

/** Historical Caveman settings alias, owned by control-api. */
@Controller("api/context/caveman/config")
export class CavemanConfigController {
  constructor(private readonly compression: CompressionSettingsService) {}

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      return reply.send(await this.compression.getSettings());
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Put()
  async update(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const validation = validateBody(compressionSettingsUpdateSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    try {
      return reply.send(await this.compression.updateSettings(validation.data));
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }
}
