import { Controller, Req, Res, Get, Post } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProviderOnboardingService } from "./provider-onboarding.service.js";

@Controller("api/providers")
export class ProviderOnboardingController {
  constructor(
    private readonly service: ProviderOnboardingService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Get("free-onboarding")
  freeProviders(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.freeProviders(req));
  }

  @Post("free-onboarding")
  setupFreeProviders(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.setupFreeProviders(req));
  }

  @Get("cursor/agent-availability")
  cursorAgentAvailability(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.cursorAgentAvailability());
  }

  @Get("health-autopilot")
  healthAutopilot(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.healthAutopilot(req));
  }

  @Post("health-autopilot/actions")
  healthAutopilotAction(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.healthAutopilotAction(req));
  }
}
