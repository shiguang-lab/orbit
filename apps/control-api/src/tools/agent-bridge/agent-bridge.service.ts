import { Injectable } from "@nestjs/common";
import * as config from "./handlers/config.handler.js";
import * as bypass from "./handlers/bypass.handler.js";
import * as agents from "./handlers/agents.handler.js";
import * as detect from "./handlers/detect.handler.js";
import * as detectedModels from "./handlers/detected-models.handler.js";
import * as mappings from "./handlers/mappings.handler.js";

/** AgentBridge use cases; transport stays in AgentBridgeController. */
@Injectable()
export class AgentBridgeService {
  configGet() { return config.GET(); }
  configPost(request: Request) { return config.POST(request); }
  bypassGet() { return bypass.GET(); }
  bypassPost(request: Request) { return bypass.POST(request); }
  bypassDelete(request: Request) { return bypass.DELETE(request); }
  agents() { return agents.list(); }
  agent(request: Request, id: string) { return agents.detail(request, { params: { id } }); }
  agentPatch(request: Request, id: string) { return agents.patch(request, { params: { id } }); }
  detect(request: Request, id: string) { return detect.GET(request, { params: { id } }); }
  detectedModels(request: Request, id: string) { return detectedModels.GET(request, { params: { id } }); }
  mappingsGet(request: Request, id: string) { return mappings.GET(request, { params: { id } }); }
  mappingsPut(request: Request, id: string) { return mappings.PUT(request, { params: { id } }); }
}
