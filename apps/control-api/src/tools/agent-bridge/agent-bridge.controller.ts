import { Controller, Delete, Get, Patch, Post, Put, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { AgentBridgeService } from "./agent-bridge.service.js";

/** Control-plane AgentBridge administration endpoints. */
@Controller("api/tools/agent-bridge")
export class AgentBridgeController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: AgentBridgeService) {}

  @Get("config") configGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.configGet()); }
  @Post("config") configPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.configPost(r)); }
  @Get("bypass") bypassGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.bypassGet()); }
  @Post("bypass") bypassPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.bypassPost(r)); }
  @Delete("bypass") bypassDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.bypassDelete(r)); }
  @Get("agents") agents(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.agents()); }
  @Get("agents/:id") agent(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.agent(r, id)); }
  @Patch("agents/:id") agentPatch(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.agentPatch(r, id)); }
  @Get("agents/:id/detect") detect(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.detect(r, id)); }
  @Get("agents/:id/detected-models") detectedModels(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.detectedModels(r, id)); }
  @Get("agents/:id/mappings") mappingsGet(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.mappingsGet(r, id)); }
  @Put("agents/:id/mappings") mappingsPut(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.mappingsPut(r, id)); }
  @Get("state") state(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.state()); }
  @Get("diagnose") diagnose(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.diagnose(r)); }
  @Get("cert") cert(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.cert()); }
  @Post("cert") certPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.certPost(r)); }
  @Delete("cert") certDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.certDelete(r)); }
  @Post("cert/regenerate") certRegenerate(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.certRegenerate()); }
  @Get("cert/download") certDownload(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.certDownload()); }
  @Post("agents/:id/dns") dns(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.dns(r, id)); }
  @Post("repair") repair(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.repair(r)); }
  @Post("server") server(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.server(r)); }
  @Get("tproxy") tproxyGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.tproxyGet()); }
  @Post("tproxy") tproxyPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.tproxyPost(r)); }
  @Delete("tproxy") tproxyDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.tproxyDelete()); }
  @Get("upstream-ca") upstreamCaGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.service.upstreamCaGet()); }
  @Post("upstream-ca") upstreamCaPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.upstreamCaPost(r)); }
  @Post("upstream-ca/test") upstreamCaTest(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.upstreamCaTest(r)); }
}
