import { Inject, Controller, Delete, Get, Patch, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ResilienceService } from "./resilience.service.js";

@Controller("api/resilience")
export class ResilienceController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher, @Inject(ResilienceService) private readonly resilience: ResilienceService) {}

  @Get()
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.resilience.get());
  }

  @Patch()
  patch(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.resilience.patch(r));
  }

  @Get("connections")
  connections(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.resilience.connections(r));
  }

  @Get("model-cooldowns")
  modelCooldowns(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.resilience.modelCooldowns(r));
  }

  @Delete("model-cooldowns")
  clearModelCooldowns(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.resilience.clearModelCooldowns(r));
  }

  @Post("reset")
  reset(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.resilience.reset(r));
  }
}
