import { Inject, Controller, Delete, Get, Options, Patch, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { RadarService } from "./radar.service.js";
@Controller("api/radar")
export class RadarController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher, @Inject(RadarService) private readonly radar: RadarService) {}
  @Options("catalog") optionsCatalog(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/catalog.handler.js").then((m) => m.OPTIONS())); }
  @Get("catalog") catalog(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.catalog(x)); }
  @Options("referrals") optionsReferrals(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/referrals.handler.js").then((m) => m.OPTIONS())); }
  @Get("referrals") referrals(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.referrals(x)); }
  @Options("offers") optionsOffers(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/offers.handler.js").then((m) => m.OPTIONS())); }
  @Get("offers") offers(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.offers(x)); }
  @Options("offers/sync") optionsOffersSync(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/offers-sync.handler.js").then((m) => m.OPTIONS())); }
  @Post("offers/sync") offersSync(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.offersSync(x)); }
  @Options("intel") optionsIntel(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/intel.handler.js").then((m) => m.OPTIONS())); }
  @Get("intel") intel(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.intel(x)); }
  @Options("intel/sync") optionsIntelSync(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/intel-sync.handler.js").then((m) => m.OPTIONS())); }
  @Post("intel/sync") intelSync(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.intelSync(x)); }
  @Options("sync") optionsSync(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/sync.handler.js").then((m) => m.OPTIONS())); }
  @Post("sync") sync(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.sync(x)); }
  @Options("sync-all") optionsSyncAll(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/sync-all.handler.js").then((m) => m.OPTIONS())); }
  @Post("sync-all") syncAll(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.syncAll(x)); }
  @Options("settings") optionsSettings(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/settings.handler.js").then((m) => m.OPTIONS())); }
  @Get("settings") settingsGet(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.settingsGet(x)); }
  @Post("settings") settingsPost(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.settingsPost(x)); }
  @Options("status") optionsStatus(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/status.handler.js").then((m) => m.OPTIONS())); }
  @Get("status") status(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.status(x)); }
  @Options("local-model-state") optionsLocal(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, () => import("./handlers/local-model-state.handler.js").then((m) => m.OPTIONS())); }
  @Get("local-model-state") localGet(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.localGet(x)); }
  @Patch("local-model-state") localPatch(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.localPatch(x)); }
  @Put("local-model-state") localPut(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.localPut(x)); }
  @Delete("local-model-state") localDelete(@Req() q: FastifyRequest, @Res() r: FastifyReply) { return this.routes.dispatch(q, r, (x) => this.radar.localDelete(x)); }
}
