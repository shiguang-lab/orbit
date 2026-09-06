import { Injectable, type OnModuleInit } from "@nestjs/common";
import * as anomalies from "./handlers/anomalies.handler.js";
import * as badges from "./handlers/badges.handler.js";
import * as badgesEarned from "./handlers/badges-earned.handler.js";
import * as federationLeaderboard from "./handlers/federation-leaderboard.handler.js";
import * as federationScore from "./handlers/federation-score.handler.js";
import * as invite from "./handlers/invite.handler.js";
import * as inviteRedeem from "./handlers/invite-redeem.handler.js";
import * as leaderboard from "./handlers/leaderboard.handler.js";
import * as level from "./handlers/level.handler.js";
import * as notifications from "./handlers/notifications.handler.js";
import * as rotate from "./handlers/rotate.handler.js";
import * as servers from "./handlers/servers.handler.js";
import * as stream from "./handlers/stream.handler.js";
import * as transfer from "./handlers/transfer.handler.js";
import { ensureGamificationSchema } from "./gamification-schema.js";

/** Control-plane gamification use cases. HTTP transport is owned by GamificationController. */
@Injectable()
export class GamificationService implements OnModuleInit {
  onModuleInit(): void {
    ensureGamificationSchema();
  }

  anomalies(request: Request) { return anomalies.GET(request); }
  badges(request: Request) { return badges.GET(request); }
  badgesEarned(request: Request) { return badgesEarned.GET(request); }
  federationLeaderboard(request: Request) { return federationLeaderboard.GET(request); }
  federationScore(request: Request) { return federationScore.POST(request); }
  inviteGet(request: Request) { return invite.GET(request); }
  invitePost(request: Request) { return invite.POST(request); }
  inviteDelete(request: Request) { return invite.DELETE(request); }
  inviteRedeem(request: Request) { return inviteRedeem.POST(request); }
  leaderboard(request: Request) { return leaderboard.GET(request); }
  level(request: Request) { return level.GET(request); }
  notifications(request: Request) { return notifications.GET(request); }
  rotate(request: Request) { return rotate.POST(request); }
  serversGet(request: Request) { return servers.GET(request); }
  serversPost(request: Request) { return servers.POST(request); }
  serversDelete(request: Request) { return servers.DELETE(request); }
  stream(request: Request) { return stream.GET(request); }
  transferGet(request: Request) { return transfer.GET(request); }
  transferPost(request: Request) { return transfer.POST(request); }
}
