import { Controller, Delete, Get, Inject, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { CliproxyService } from "./cliproxy.service.js";

@Controller("api/services/cliproxy")
export class CliproxyController {
  constructor(
    @Inject(CliproxyService) private readonly service: CliproxyService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}
  @Get("instances") listInstances(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.listInstances(r)); }
  @Post("instances") createInstance(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.createInstance(r)); }
  @Put("instances/:id") updateInstance(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { const id = String((req.params as { id?: string }).id ?? ""); return this.routes.dispatch(req, reply, (r) => this.service.updateInstance(r, id)); }
  @Delete("instances/:id") deleteInstance(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { const id = String((req.params as { id?: string }).id ?? ""); return this.routes.dispatch(req, reply, (r) => this.service.deleteInstance(r, id)); }
  @Post("instances/:id/probe") probeInstance(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { const id = String((req.params as { id?: string }).id ?? ""); return this.routes.dispatch(req, reply, (r) => this.service.probeInstance(r, id)); }
  @Get("model-mappings") getModelMappings(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.getModelMappings(r)); }
  @Post("model-mappings") updateModelMappings(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.updateModelMappings(r)); }
  @Get("accounts") accounts(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.accounts(r)); }
  @Post("auto-restart-adopted") autoRestartAdopted(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.autoRestartAdopted(r)); }
  @Post("auto-start") autoStart(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.autoStart(r)); }
  @Post("install") install(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.install(r)); }
  @Post("provider-expose") providerExpose(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.providerExpose(r)); }
  @Post("restart") restart(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.restart()); }
  @Post("start") start(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.start()); }
  @Get("status") status(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.status()); }
  @Post("stop") stop(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.stop()); }
  @Post("update") update(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.update()); }
  @Post("login/start") loginStart(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.loginStart(r)); }
  @Get("login/:id") loginGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { const id = String((req.params as { id?: string }).id ?? ""); return this.routes.dispatch(req, reply, (r) => this.service.loginGet(r, id)); }
  @Post("login/:id/cancel") loginCancel(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { const id = String((req.params as { id?: string }).id ?? ""); return this.routes.dispatch(req, reply, (r) => this.service.loginCancel(r, id)); }
}
