import { Inject, Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { TelemetryService } from "./telemetry.service.js";

@Controller("api/telemetry")
export class TelemetryController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher, @Inject(TelemetryService) private readonly telemetry: TelemetryService) {}

  @Get("summary")
  summary(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.telemetry.summary(request));
  }
}
