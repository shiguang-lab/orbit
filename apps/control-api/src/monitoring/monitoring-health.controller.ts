import { Controller, Delete, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { MonitoringHealthService } from "./monitoring-health.service.js";

@Controller("api/monitoring/health")
export class MonitoringHealthController {
  constructor(
    private readonly service: MonitoringHealthService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Get()
  read(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async (request) => {
      const fullView = (await requireManagementAuth(request, { alwaysRequireAuth: true })) === null;
      return this.service.read(fullView);
    });
  }

  @Delete()
  reset(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async (request) => {
      if (!(await isAuthenticated(request))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return this.service.reset();
    });
  }
}
