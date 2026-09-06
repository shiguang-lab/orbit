import { Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { SettingsCleanupService } from "./settings-cleanup.service.js";

/** HTTP transport for destructive settings-data cleanup operations. */
@Controller("api/settings")
export class SettingsCleanupController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(SettingsCleanupService) private readonly cleanup: SettingsCleanupService,
  ) {}

  @Post("purge-call-logs")
  purgeCallLogs(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.cleanup.purgeCallLogs(req));
  }

  @Post("purge-detailed-logs")
  purgeDetailedLogs(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.cleanup.purgeDetailedLogs(req));
  }

  @Post("purge-logs")
  purgeLogs(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.cleanup.purgeLogs(req));
  }

  @Post("purge-quota-snapshots")
  purgeQuotaSnapshots(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.cleanup.purgeQuotaSnapshots(req));
  }

  @Post("purge-request-history")
  purgeRequestHistory(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.cleanup.purgeRequestHistory(req));
  }

  @Post("purge-usage-history")
  purgeUsageHistory(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.cleanup.purgeUsageHistory(req));
  }
}
