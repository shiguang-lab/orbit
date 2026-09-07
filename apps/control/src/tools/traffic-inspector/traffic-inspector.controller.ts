import { Inject, Controller, Delete, Get, Param, Patch, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { appendSessionRequest, deleteSession, exportSessionHar, getSession, patchSession } from "./sessions.handlers.js";
import { TrafficInspectorService } from "./traffic-inspector.service.js";

/** Session persistence endpoints for the control-plane Traffic Inspector. */
@Controller("api/tools/traffic-inspector")
export class TrafficInspectorController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher, @Inject(TrafficInspectorService) private readonly service: TrafficInspectorService) {}

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

  @Post("capture-modes/http-proxy")
  httpProxy(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.captureHttpProxy(webRequest));
  }

  @Post("capture-modes/system-proxy")
  systemProxy(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.captureSystemProxy(webRequest));
  }

  @Post("capture-modes/tls-intercept")
  tlsIntercept(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.toggleTlsIntercept(webRequest));
  }

  @Get("export.har")
  export(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.exportHar(webRequest));
  }

  @Delete("hosts/:host")
  hostDelete(@Param("host") host: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.deleteHost(host), { host });
  }

  @Patch("hosts/:host")
  hostPatch(@Param("host") host: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.patchHost(webRequest, host), { host });
  }

  @Post("internal/ingest")
  ingest(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.ingestRequest(webRequest));
  }

  @Get("requests/:id")
  requestGet(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.getRequest(id), { id });
  }

  @Put("requests/:id/annotation")
  requestAnnotation(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.annotateRequest(webRequest, id), { id });
  }

  @Post("requests/:id/replay")
  requestReplay(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.replayRequest(id), { id });
  }

  @Get("ws")
  ws(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.service.handleWebSocket(request, reply);
  }
}
