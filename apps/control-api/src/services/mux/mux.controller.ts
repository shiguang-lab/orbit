import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { MuxService } from "./mux.service.js";

@Controller("api/services/mux")
export class MuxController {
  constructor(private readonly service: MuxService, private readonly routes: WebRouteDispatcher) {}
  @Get("status") status(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.status()); }
  @Post("install") install(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.install(r)); }
  @Post("auto-start") autoStart(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.autoStart(r)); }
  @Post("auto-restart-adopted") autoRestartAdopted(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (r) => this.service.autoRestartAdopted(r)); }
  @Post("start") start(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.start()); }
  @Post("restart") restart(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.restart()); }
  @Post("stop") stop(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.stop()); }
  @Post("update") update(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, () => this.service.update()); }
}
