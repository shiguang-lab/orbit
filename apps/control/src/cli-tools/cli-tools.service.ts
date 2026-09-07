import { Injectable } from "@nestjs/common";
import * as deepseekTui from "./handlers/deepseek-tui-settings.handler.js";
import * as forge from "./handlers/forge-settings.handler.js";
import * as pi from "./handlers/pi-settings.handler.js";
import * as codexSettings from "./handlers/codex-settings.handler.js";
import * as codexProfiles from "./handlers/codex-profiles.handler.js";
import * as cliStatus from "./handlers/cli-tools-status.handler.js";
import * as allStatuses from "./handlers/all-statuses.handler.js";
import * as detect from "./migrated-handlers/detect.handler.js";
import * as config from "./migrated-handlers/config.handler.js";
import * as apply from "./migrated-handlers/apply.handler.js";
import * as backups from "./migrated-handlers/backups.handler.js";
import * as keys from "./migrated-handlers/keys.handler.js";
import * as logs from "./migrated-handlers/logs.handler.js";
import * as runtime from "./migrated-handlers/runtime/[toolId].handler.js";
import * as guideSettings from "./migrated-handlers/guide-settings/[toolId].handler.js";
import * as antigravityMitm from "./migrated-handlers/antigravity-mitm.handler.js";
import * as antigravityAlias from "./migrated-handlers/antigravity-mitm/alias.handler.js";
import * as openclawAutoOrder from "./migrated-handlers/openclaw/auto-order.handler.js";
import * as claudeSettings from "./migrated-handlers/claude-settings.handler.js";
import * as clineSettings from "./migrated-handlers/cline-settings.handler.js";
import * as codewhaleSettings from "./migrated-handlers/codewhale-settings.handler.js";
import * as crushSettings from "./migrated-handlers/crush-settings.handler.js";
import * as droidSettings from "./migrated-handlers/droid-settings.handler.js";
import * as grokBuildSettings from "./migrated-handlers/grok-build-settings.handler.js";
import * as hermesAgentSettings from "./migrated-handlers/hermes-agent-settings.handler.js";
import * as jcodeSettings from "./migrated-handlers/jcode-settings.handler.js";
import * as kiloSettings from "./migrated-handlers/kilo-settings.handler.js";
import * as lettaSettings from "./migrated-handlers/letta-settings.handler.js";
import * as ompSettings from "./migrated-handlers/omp-settings.handler.js";
import * as openclawSettings from "./migrated-handlers/openclaw-settings.handler.js";
import * as qwenSettings from "./migrated-handlers/qwen-settings.handler.js";
import * as smeltSettings from "./migrated-handlers/smelt-settings.handler.js";

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

  async dispatch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname.replace(/^\/api\/cli-tools\/?/, "").replace(/\/$/, "");
    const dynamic = path.match(/^runtime\/([^/]+)$/) ?? path.match(/^guide-settings\/([^/]+)$/);
    const route = dynamic
      ? (path.startsWith("runtime/") ? runtime : guideSettings)
      : {
          detect, config, apply, backups, keys, logs, "antigravity-mitm": antigravityMitm,
          "antigravity-mitm/alias": antigravityAlias, "openclaw/auto-order": openclawAutoOrder,
          "claude-settings": claudeSettings, "cline-settings": clineSettings,
          "codewhale-settings": codewhaleSettings, "crush-settings": crushSettings,
          "droid-settings": droidSettings, "grok-build-settings": grokBuildSettings,
          "hermes-agent-settings": hermesAgentSettings, "jcode-settings": jcodeSettings,
          "kilo-settings": kiloSettings, "letta-settings": lettaSettings,
          "omp-settings": ompSettings, "openclaw-settings": openclawSettings,
          "qwen-settings": qwenSettings, "smelt-settings": smeltSettings,
        }[path];
    const handler = route?.[request.method as keyof typeof route] as ((request: Request, context?: { params: Record<string, string> }) => Promise<Response>) | undefined;
    if (!handler) return Response.json({ error: "Not found" }, { status: 404 });
    const params = dynamic ? { toolId: dynamic[1] } : undefined;
    return handler(request, params ? { params } : undefined);
  }
}
