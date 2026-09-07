import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { DarioService } from "./dario.service.js";
@Controller("api/services/dario")
export class DarioController {
  constructor(
    @Inject(DarioService) private readonly service: DarioService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}
  @Get("status") status(@Req() q: FastifyRequest, @Res() p: FastifyReply) { return this.routes.dispatch(q, p, () => this.service.status()); }
  @Post("install") install(@Req() q: FastifyRequest, @Res() p: FastifyReply) { return this.routes.dispatch(q, p, (r) => this.service.install(r)); }
  @Post("auto-start") autoStart(@Req() q: FastifyRequest, @Res() p: FastifyReply) { return this.routes.dispatch(q, p, (r) => this.service.toggle(r, "autoStart")); }
  @Post("auto-restart-adopted") autoRestart(@Req() q: FastifyRequest, @Res() p: FastifyReply) { return this.routes.dispatch(q, p, (r) => this.service.toggle(r, "autoRestartAdopted")); }
  @Post("start") start(@Req() q: FastifyRequest, @Res() p: FastifyReply) { return this.routes.dispatch(q, p, () => this.service.start()); }
  @Post("restart") restart(@Req() q: FastifyRequest, @Res() p: FastifyReply) { return this.routes.dispatch(q, p, () => this.service.restart()); }
  @Post("stop") stop(@Req() q: FastifyRequest, @Res() p: FastifyReply) { return this.routes.dispatch(q, p, () => this.service.stop()); }
  @Post("update") update(@Req() q: FastifyRequest, @Res() p: FastifyReply) { return this.routes.dispatch(q, p, () => this.service.update()); }
}
