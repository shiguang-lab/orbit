import { toWebRequest } from "@orbit/http/web-handler";
import { Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { preview } from "./compression-preview.legacy.js";
import { POST as verify } from "./compression-verify.legacy.js";

/** Compatibility transport for the compression playground endpoints. */
@Controller("api/compression")
export class CompressionLegacyController {
  @Post("preview")
  preview(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(reply, preview(request.body));
  }

  @Post("compare/verify")
  verify(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(reply, verify(toWebRequest(request)));
  }

  private async dispatch(reply: FastifyReply, response: Promise<Response>) {
    const resolved = await response;
    const body = await resolved.json().catch(() => undefined);
    return reply.status(resolved.status).send(body);
  }
}
