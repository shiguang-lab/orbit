import { Injectable, type OnModuleInit } from "@nestjs/common";
import * as config from "./handlers/config.handler.js";
import * as bypass from "./handlers/bypass.handler.js";
import * as agents from "./handlers/agents.handler.js";
import * as detect from "./handlers/detect.handler.js";
import * as detectedModels from "./handlers/detected-models.handler.js";
import * as mappings from "./handlers/mappings.handler.js";
import * as state from "./handlers/state.handler.js";
import * as diagnose from "./handlers/diagnose.handler.js";
import * as cert from "./handlers/cert.handler.js";
import * as certRegenerate from "./handlers/cert-regenerate.handler.js";
import * as certDownload from "./handlers/cert-download.handler.js";
import * as dns from "./handlers/dns.handler.js";
import * as repair from "./handlers/repair.handler.js";
import * as server from "./handlers/server.handler.js";
import * as tproxy from "./handlers/tproxy.handler.js";
import * as upstreamCa from "./handlers/upstream-ca.handler.js";
import * as upstreamCaTest from "./handlers/upstream-ca-test.handler.js";
import { ensureAgentBridgeSchema } from "./agent-bridge-schema.js";
import { agentBridgePersistence } from "./agent-bridge.persistence.js";
import { configureAgentBridgeStore } from "@orbit/core/control/agent-bridge";

/** AgentBridge use cases; transport stays in AgentBridgeController. */
@Injectable()
export class AgentBridgeService implements OnModuleInit {
  onModuleInit(): void {
    ensureAgentBridgeSchema();
    configureAgentBridgeStore(agentBridgePersistence);
  }

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
  state() { return state.GET(); }
  diagnose(request: Request) { return diagnose.GET(request); }
  cert() { return cert.GET(); }
  certPost(request: Request) { return cert.POST(request); }
  certDelete(request: Request) { return cert.DELETE(request); }
  certRegenerate() { return certRegenerate.POST(); }
  certDownload() { return certDownload.GET(); }
  dns(request: Request, id: string) { return dns.POST(request, { params: { id } }); }
  repair(request: Request) { return repair.POST(request); }
  server(request: Request) { return server.POST(request); }
  tproxyGet() { return tproxy.GET(); }
  tproxyPost(request: Request) { return tproxy.POST(request); }
  tproxyDelete() { return tproxy.DELETE(); }
  upstreamCaGet() { return upstreamCa.GET(); }
  upstreamCaPost(request: Request) { return upstreamCa.POST(request); }
  upstreamCaTest(request: Request) { return upstreamCaTest.POST(request); }
}
