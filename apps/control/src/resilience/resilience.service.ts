import { Injectable } from "@nestjs/common";
import * as connections from "./handlers/connections.handler.js";
import * as modelCooldowns from "./handlers/model-cooldowns.handler.js";
import * as reset from "./handlers/reset.handler.js";
import * as resilience from "./handlers/resilience.handler.js";

/** Control-plane resilience use cases. HTTP transport stays in ResilienceController. */
@Injectable()
export class ResilienceService {
  get() { return resilience.GET(); }
  patch(request: Request) { return resilience.PATCH(request); }
  connections(request: Request) { return connections.GET(request); }
  modelCooldowns(request: Request) { return modelCooldowns.GET(request); }
  clearModelCooldowns(request: Request) { return modelCooldowns.DELETE(request); }
  reset(request: Request) { return reset.POST(request); }
}
