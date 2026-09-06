import { Controller, Delete, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { UsageService } from "./usage.service.js";

@Controller("api/usage")
export class UsageController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(UsageService) private readonly usage: UsageService,
  ) {}

  @Get("budget")
  getBudget(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getBudget(req));
  }

  @Post("budget")
  setBudget(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.setBudget(req));
  }

  @Get("budget/bulk")
  getBulkBudget(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getBulkBudget(req));
  }

  @Get("history")
  getHistory(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getHistory(req));
  }

  @Get("model-latency-stats")
  getModelLatencyStats(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getModelLatencyStats(req));
  }

  @Get("cache-health")
  getCacheHealth(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getCacheHealth(req));
  }

  @Get("provider-window-costs")
  getProviderWindowCosts(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getProviderWindowCosts(req));
  }

  @Get("route-explain/:id")
  getRouteExplain(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getRouteExplain(req, id), { id });
  }

  @Get("utilization")
  getUtilization(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getUtilization(req));
  }

  @Get("codex-reset-credit")
  getCodexResetCredit(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getCodexResetCredit(req));
  }

  @Post("codex-reset-credit")
  consumeCodexResetCredit(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.consumeCodexResetCredit(req));
  }

  @Get("combo-forecast")
  getComboForecast(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getComboForecast(req));
  }

  @Get("combo-health-dashboard")
  getComboHealthDashboard(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getComboHealthDashboard(req));
  }

  @Get("combo-health-autopilot")
  getComboHealthAutopilot(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getComboHealthAutopilot(req));
  }

  @Get("combo-scoring-inspector")
  getComboScoringInspector(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getComboScoringInspector(req));
  }

  @Get("analytics")
  getAnalytics(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getAnalytics(req));
  }

  @Get("requests-by-provider-date")
  getRequestsByProviderDate(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getRequestsByProviderDate(req));
  }

  @Get("token-limits")
  getTokenLimits(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getTokenLimits(req));
  }

  @Post("token-limits")
  setTokenLimits(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.setTokenLimits(req));
  }

  @Delete("token-limits")
  deleteTokenLimits(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.deleteTokenLimits(req));
  }

  @Get("quota")
  getQuota(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getQuota(req));
  }

  @Get("provider-limits")
  getProviderLimits(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.usage.getProviderLimits());
  }

  @Post("provider-limits")
  refreshProviderLimits(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.usage.refreshProviderLimits());
  }

  @Get("combo-health")
  getComboHealth(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getComboHealth(req));
  }

  @Get("combo-trace/:id")
  getComboTrace(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getComboTrace(req, id), { id });
  }

  @Get(":connectionId")
  getConnectionUsage(@Param("connectionId") connectionId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.usage.getConnectionUsage(req, connectionId), { connectionId });
  }
}
