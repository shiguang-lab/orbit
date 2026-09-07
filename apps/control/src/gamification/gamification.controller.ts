import { Inject, Controller, Delete, Get, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { GamificationService } from "./gamification.service.js";

@Controller("api/gamification")
export class GamificationController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher, @Inject(GamificationService) private readonly gamification: GamificationService) {}

  @Options("anomalies") optionsAnomalies(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/anomalies.handler.js").then((m) => m.OPTIONS())); }
  @Get("anomalies") anomalies(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.anomalies(r)); }

  @Options("badges") optionsBadges(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/badges.handler.js").then((m) => m.OPTIONS())); }
  @Get("badges") badges(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.badges(r)); }
  @Options("badges/earned") optionsBadgesEarned(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/badges-earned.handler.js").then((m) => m.OPTIONS())); }
  @Get("badges/earned") badgesEarned(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.badgesEarned(r)); }

  @Options("federation/leaderboard") optionsFederationLeaderboard(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/federation-leaderboard.handler.js").then((m) => m.OPTIONS())); }
  @Get("federation/leaderboard") federationLeaderboard(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.federationLeaderboard(r)); }
  @Options("federation/score") optionsFederationScore(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/federation-score.handler.js").then((m) => m.OPTIONS())); }
  @Post("federation/score") federationScore(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.federationScore(r)); }

  @Options("invite") optionsInvite(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/invite.handler.js").then((m) => m.OPTIONS())); }
  @Get("invite") inviteGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.inviteGet(r)); }
  @Post("invite") invitePost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.invitePost(r)); }
  @Delete("invite") inviteDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.inviteDelete(r)); }
  @Options("invite/redeem") optionsInviteRedeem(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/invite-redeem.handler.js").then((m) => m.OPTIONS())); }
  @Post("invite/redeem") inviteRedeem(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.inviteRedeem(r)); }

  @Options("leaderboard") optionsLeaderboard(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/leaderboard.handler.js").then((m) => m.OPTIONS())); }
  @Get("leaderboard") leaderboard(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.leaderboard(r)); }
  @Options("level") optionsLevel(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/level.handler.js").then((m) => m.OPTIONS())); }
  @Get("level") level(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.level(r)); }
  @Get("notifications") notifications(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.notifications(r)); }
  @Options("rotate") optionsRotate(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/rotate.handler.js").then((m) => m.OPTIONS())); }
  @Post("rotate") rotate(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.rotate(r)); }
  @Options("servers") optionsServers(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/servers.handler.js").then((m) => m.OPTIONS())); }
  @Get("servers") serversGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.serversGet(r)); }
  @Post("servers") serversPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.serversPost(r)); }
  @Delete("servers") serversDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.serversDelete(r)); }
  @Get("stream") stream(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.stream(r)); }
  @Options("transfer") optionsTransfer(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => import("./handlers/transfer.handler.js").then((m) => m.OPTIONS())); }
  @Get("transfer") transferGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.transferGet(r)); }
  @Post("transfer") transferPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.gamification.transferPost(r)); }
}
