import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { forceUnlock, getLockedIdentifiers } from "@shiguang-gateway/core-domain/control/policies";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { policyActionSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";

@Controller("api/policies")
export class PoliciesController {
  @Get()
  get(@Res() reply: FastifyReply) {
    try { return reply.send({ lockedIdentifiers: getLockedIdentifiers() }); }
    catch { return reply.status(500).send({ error: "Failed to load policies" }); }
  }

  @Post()
  async post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const validation = validateBody(policyActionSchema, request.body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    const { action, identifier } = validation.data;
    if (action === "unlock" && identifier) {
      forceUnlock(identifier);
      return reply.send({ success: true, action: "unlocked", identifier });
    }
    return reply.status(400).send({ error: "Unknown action. Supported: unlock" });
  }
}
