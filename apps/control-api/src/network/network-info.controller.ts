import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { NetworkInfoService } from "./network-info.service.js";

@Controller("api/network/info")
export class NetworkInfoController {
  constructor(
    private readonly service: NetworkInfoService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Get()
  read(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async (request) => {
      if (!(await isAuthenticated(request))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      return Response.json(await this.service.read(host));
    });
  }
}
