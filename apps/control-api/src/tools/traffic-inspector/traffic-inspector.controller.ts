import { Controller, Delete, Get, Param, Patch, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { appendSessionRequest, deleteSession, exportSessionHar, getSession, patchSession } from "./sessions.handlers.js";

/** Session persistence endpoints for the control-plane Traffic Inspector. */
@Controller("api/tools/traffic-inspector")
export class TrafficInspectorController {
  constructor(private readonly routes: WebRouteDispatcher) {}

  @Get("sessions/:id")
  sessionGet(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => getSession(id), { id });
  }

  @Patch("sessions/:id")
  sessionPatch(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => patchSession(webRequest, id), { id });
  }

  @Delete("sessions/:id")
  sessionDelete(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => deleteSession(id), { id });
  }

  @Post("sessions/:id/requests")
  sessionRequestAppend(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => appendSessionRequest(webRequest, id), { id });
  }

  @Get("sessions/:id/export.har")
  sessionExport(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => exportSessionHar(id), { id });
  }
}
