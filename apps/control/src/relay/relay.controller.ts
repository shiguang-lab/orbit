import { Inject, Controller, Delete, Get, Param, Patch, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { RelayService } from "./relay.service.js";

@Controller("api/relay/tokens")
export class RelayController {
  constructor(@Inject(RelayService) private readonly service: RelayService, @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}
  @Get() list(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => this.service.list()); }
  @Post() create(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.service.create(x)); }
  @Get(":id") get(@Param("id") id: string, @Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.service.get(x, id), { id }); }
  @Patch(":id") update(@Param("id") id: string, @Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.service.update(x, id), { id }); }
  @Delete(":id") remove(@Param("id") id: string, @Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.service.remove(x, id), { id }); }
}
