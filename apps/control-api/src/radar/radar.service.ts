import { Injectable, type OnModuleInit } from "@nestjs/common";
import * as catalog from "./handlers/catalog.handler.js";
import * as referrals from "./handlers/referrals.handler.js";
import * as offers from "./handlers/offers.handler.js";
import * as intel from "./handlers/intel.handler.js";
import * as sync from "./handlers/sync.handler.js";
import * as syncAll from "./handlers/sync-all.handler.js";
import * as offersSync from "./handlers/offers-sync.handler.js";
import * as intelSync from "./handlers/intel-sync.handler.js";
import * as settings from "./handlers/settings.handler.js";
import * as status from "./handlers/status.handler.js";
import * as localModelState from "./handlers/local-model-state.handler.js";

@Injectable()
export class RadarService implements OnModuleInit {
  onModuleInit(): void { /* Radar schema is managed by the shared migration runner. */ }
  catalog(request: Request) { return catalog.GET(request); }
  referrals(request: Request) { return referrals.GET(request); }
  offers(request: Request) { return offers.GET(request); }
  intel(request: Request) { return intel.GET(request); }
  sync(request: Request) { return sync.POST(request); }
  syncAll(request: Request) { return syncAll.POST(request); }
  offersSync(request: Request) { return offersSync.POST(request); }
  intelSync(request: Request) { return intelSync.POST(request); }
  settingsGet(request: Request) { return settings.GET(request); }
  settingsPost(request: Request) { return settings.POST(request); }
  status(request: Request) { return status.GET(request); }
  localGet(request: Request) { return localModelState.GET(request); }
  localPatch(request: Request) { return localModelState.PATCH(request); }
  localPut(request: Request) { return localModelState.PUT(request); }
  localDelete(request: Request) { return localModelState.DELETE(request); }
}
