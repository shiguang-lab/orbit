import { toWebRequest } from "@orbit/http/web-handler";
import { Controller, Post, Body, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { ProxyTestService } from "./proxy-test.service.js";

@Controller("api/settings/proxy")
export class ProxyController {
  constructor(@Inject(ProxyTestService) private readonly proxyTest: ProxyTestService) {}

  @Post("test")
  async test(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());
    try {
      const result = await this.proxyTest.test(body);
      return reply.status(result.status).send(result.body);
    } catch (error) {
      console.error("[ProxyTest] Unexpected server error", error);
      return reply.status(500).send({ error: "Unexpected server error" });
    }
  }
}
