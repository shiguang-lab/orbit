import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { NinerouterService } from "./ninerouter.service.js";

@Controller("api/services/9router")
export class NinerouterController {
  constructor(
    @Inject(NinerouterService) private readonly service: NinerouterService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Get("status") status(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.status(r)); }
  @Get("models") models(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.models(r)); }
  @Post("install") install(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.install(r)); }
  @Post("auto-start") autoStart(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.autoStart(r)); }
  @Post("auto-restart-adopted") autoRestartAdopted(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.autoRestartAdopted(r)); }
  @Post("provider-expose") providerExpose(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.providerExpose(r)); }
  @Post("start") start(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.start()); }
  @Post("restart") restart(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.restart()); }
  @Post("stop") stop(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.stop()); }
  @Post("rotate-key") rotateKey(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.rotateKey()); }
  @Post("update") update(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.update()); }
}
