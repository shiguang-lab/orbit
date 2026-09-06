import { Body, Controller, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { toPublicSafeTunnelError } from "@shiguang-gateway/core-domain/shared/public-safe-error";
import { validateBody, isValidationFailure } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { MitmConflictError, MitmService, MitmValidationError } from "./mitm.service.js";
import { regenerateMitmSchema, updateMitmSchema } from "./mitm.schemas.js";

/** HTTP transport for operator-managed MITM settings. */
@Controller("api/settings/mitm")
export class MitmController {
  constructor(private readonly mitm: MitmService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      if (new URL(request.url, "http://control-api").searchParams.get("download") === "cert") {
        const certificate = this.mitm.getCertificate();
        if (!certificate) return reply.status(404).send({ error: "MITM certificate not found" });
        return reply
          .header("Content-Type", "application/x-pem-file")
          .header("Content-Disposition", 'attachment; filename="shiguangGateway-mitm-ca.crt"')
          .send(certificate);
      }
      return reply.send(await this.mitm.getSettings());
    } catch (error) {
      return reply.status(500).send(
        toPublicSafeTunnelError(error, "Failed to load the MITM settings.", "settings/mitm GET"),
      );
    }
  }

  @Put()
  async update(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = validateBody(updateMitmSchema, body ?? {});
    if (isValidationFailure(parsed)) return reply.status(400).send({ error: parsed.error });
    try {
      return reply.send(await this.mitm.update(parsed.data));
    } catch (error) {
      if (error instanceof MitmValidationError) return reply.status(400).send({ error: error.message });
      return reply.status(500).send(
        toPublicSafeTunnelError(error, "Failed to update the MITM settings.", "settings/mitm PUT"),
      );
    }
  }

  @Post()
  async regenerate(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = validateBody(regenerateMitmSchema, body ?? {});
    if (isValidationFailure(parsed)) return reply.status(400).send({ error: parsed.error });
    try {
      return reply.send(await this.mitm.regenerateCertificate());
    } catch (error) {
      if (error instanceof MitmConflictError) return reply.status(409).send({ error: error.message });
      return reply.status(500).send(
        toPublicSafeTunnelError(
          error,
          "Failed to regenerate the MITM certificate.",
          "settings/mitm POST",
        ),
      );
    }
  }
}
