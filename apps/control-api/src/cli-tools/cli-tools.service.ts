import { Injectable } from "@nestjs/common";
import * as deepseekTui from "./handlers/deepseek-tui-settings.handler.js";
import * as forge from "./handlers/forge-settings.handler.js";
import * as pi from "./handlers/pi-settings.handler.js";

/** Control-plane use cases for local CLI configuration. */
@Injectable()
export class CliToolsService {
  deepseekTuiGet(request: Request) { return deepseekTui.GET(request); }
  deepseekTuiPost(request: Request) { return deepseekTui.POST(request); }
  deepseekTuiDelete(request: Request) { return deepseekTui.DELETE(request); }
  forgeGet(request: Request) { return forge.GET(request); }
  forgePost(request: Request) { return forge.POST(request); }
  forgeDelete(request: Request) { return forge.DELETE(request); }
  piGet(request: Request) { return pi.GET(request); }
  piPost(request: Request) { return pi.POST(request); }
  piDelete(request: Request) { return pi.DELETE(request); }
}
