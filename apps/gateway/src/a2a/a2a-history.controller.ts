import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply,FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { A2aService } from "./a2a.service.js";
@Controller(["a2a/tasks/history","api/a2a/tasks/history"])
export class A2aHistoryController{constructor(@Inject(WebRouteDispatcher)private readonly routes:WebRouteDispatcher,@Inject(A2aService)private readonly a2a:A2aService){}@Get()list(@Req()request:FastifyRequest,@Res()reply:FastifyReply){return this.routes.dispatch(request,reply,r=>this.a2a.history(r));}}
