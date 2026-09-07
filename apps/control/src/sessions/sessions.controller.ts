import { Inject, Controller, Get, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { SessionsService } from "./sessions.service.js";
@Controller("api")
export class SessionsController {
  constructor(@Inject(SessionsService) private readonly service: SessionsService, @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}
  @Get("sessions") sessions(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.service.sessions(x)); }
  @Get("session-pools") pools(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.service.pools(x)); }
  @Get("session-pools/:provider") pool(@Param("provider") p: string, @Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.service.pool(x, p), { provider: p }); }
  @Get("routing/decisions/:requestId") decision(@Param("requestId") id: string, @Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.service.decision(x, id), { requestId: id }); }
}
