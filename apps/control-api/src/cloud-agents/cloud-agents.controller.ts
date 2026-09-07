import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { readCloudAgentTasks } from "../edge-runtime/client.js";

@Controller("api/cloud-agents")
export class CloudAgentsController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Get("tasks")
  tasks(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (webRequest) => {
      const authError = await requireManagementAuth(webRequest);
      return authError ?? readCloudAgentTasks(webRequest);
    });
  }
}
