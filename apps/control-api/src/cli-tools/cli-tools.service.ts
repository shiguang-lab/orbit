import { Injectable } from "@nestjs/common";
import * as deepseekTui from "./handlers/deepseek-tui-settings.handler.js";
import * as forge from "./handlers/forge-settings.handler.js";
import * as pi from "./handlers/pi-settings.handler.js";
import * as codexSettings from "./handlers/codex-settings.handler.js";
import * as codexProfiles from "./handlers/codex-profiles.handler.js";
import * as cliStatus from "./handlers/cli-tools-status.handler.js";
import * as allStatuses from "./handlers/all-statuses.handler.js";

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
  codexSettingsGet(request: Request) { return codexSettings.GET(request); }
  codexSettingsPost(request: Request) { return codexSettings.POST(request); }
  codexSettingsDelete(request: Request) { return codexSettings.DELETE(request); }
  codexProfilesGet(request: Request) { return codexProfiles.GET(request); }
  codexProfilesPost(request: Request) { return codexProfiles.POST(request); }
  codexProfilesPut(request: Request) { return codexProfiles.PUT(request); }
  codexProfilesDelete(request: Request) { return codexProfiles.DELETE(request); }
  cliStatusGet(request: Request) { return cliStatus.GET(request); }
  allStatusesGet(request: Request) { return allStatuses.GET(request); }
}
