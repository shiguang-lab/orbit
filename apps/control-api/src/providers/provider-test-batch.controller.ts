import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { ProviderTestBatchService } from "./provider-test-batch.service.js";
@Controller("api/providers")
export class ProviderTestBatchController {
  constructor(private readonly service: ProviderTestBatchService) {}
  @Post("test-batch")
  async test(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    const authError = await requireManagementAuth(toWebRequest(req));
    if (authError) return reply.status(authError.status).send(await authError.json());
    const result = await this.service.test(body);
    return reply.status(result.status).send(result.body);
  }
}
