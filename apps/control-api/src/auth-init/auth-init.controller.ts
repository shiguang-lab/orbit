import { Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { initializeControlRuntime, issueDahlTokens } from "@shiguang-gateway/core-domain/control/auth-init";
import { completeCodexDeviceFlow, getCodexDeviceTicket } from "@shiguang-gateway/open-sse/oauth/codex-device-completion";

@Controller()
export class AuthInitController {
  constructor(private readonly routes: WebRouteDispatcher) {}

  private response(result: { status: number; body: unknown }) { return Response.json(result.body, { status: result.status }); }

  @Get("api/codex/connect/:token")
  codexGet(@Param("token") token: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.response(getCodexDeviceTicket(token)));
  }

  @Post("api/codex/connect/:token")
  async codexPost(@Param("token") token: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async (request) => {
      const result = await completeCodexDeviceFlow(token, await request.json());
      return this.response(result);
    });
  }

  @Post("api/dahl/tokens")
  dahl(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async () => this.response(await issueDahlTokens()));
  }

  @Get("api/init")
  init(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async () => this.response(await initializeControlRuntime()));
  }
}
