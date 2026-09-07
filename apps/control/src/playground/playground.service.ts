import { Injectable } from "@nestjs/common";
import * as improvePrompt from "./handlers/improve-prompt.handler.js";
import * as presets from "./handlers/presets.handler.js";
import * as presetById from "./handlers/preset-by-id.handler.js";
import * as simulateRoute from "./handlers/simulate-route.handler.js";

/** Playground use cases. HTTP transport is owned by PlaygroundController. */
@Injectable()
export class PlaygroundService {
  improvePrompt(request: Request) { return improvePrompt.POST(request); }
  improvePromptOptions() { return improvePrompt.OPTIONS(); }
  simulateRoute(request: Request) { return simulateRoute.POST(request); }
  presetsGet(request: Request) { return presets.GET(request); }
  presetsPost(request: Request) { return presets.POST(request); }
  presetsOptions() { return presets.OPTIONS(); }
  presetGet(request: Request, id: string) { return presetById.GET(request, { params: { id } }); }
  presetPut(request: Request, id: string) { return presetById.PUT(request, { params: { id } }); }
  presetDelete(request: Request, id: string) { return presetById.DELETE(request, { params: { id } }); }
  presetOptions() { return presetById.OPTIONS(); }
}
