import { Inject, All, Controller, Delete, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CliToolsService } from "./cli-tools.service.js";

@Controller("api/cli-tools")
export class CliToolsController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher, @Inject(CliToolsService) private readonly cliTools: CliToolsService) {}

  @Get("deepseek-tui-settings")
  deepseekTuiGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.deepseekTuiGet(request));
  }
  @Post("deepseek-tui-settings")
  deepseekTuiPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.deepseekTuiPost(request));
  }
  @Delete("deepseek-tui-settings")
  deepseekTuiDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.deepseekTuiDelete(request));
  }

  @Get("forge-settings")
  forgeGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.forgeGet(request));
  }
  @Post("forge-settings")
  forgePost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.forgePost(request));
  }
  @Delete("forge-settings")
  forgeDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.forgeDelete(request));
  }

  @Get("pi-settings")
  piGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.piGet(request));
  }
  @Post("pi-settings")
  piPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.piPost(request));
  }
  @Delete("pi-settings")
  piDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.piDelete(request));
  }

  @Get("codex-settings")
  codexSettingsGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.codexSettingsGet(request));
  }
  @Post("codex-settings")
  codexSettingsPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.codexSettingsPost(request));
  }
  @Delete("codex-settings")
  codexSettingsDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.codexSettingsDelete(request));
  }

  @Get("codex-profiles")
  codexProfilesGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.codexProfilesGet(request));
  }
  @Post("codex-profiles")
  codexProfilesPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.codexProfilesPost(request));
  }
  @Put("codex-profiles")
  codexProfilesPut(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.codexProfilesPut(request));
  }
  @Delete("codex-profiles")
  codexProfilesDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.codexProfilesDelete(request));
  }

  @Get("status")
  cliStatusGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.cliStatusGet(request));
  }

  @Get("all-statuses")
  allStatusesGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.allStatusesGet(request));
  }

  @Get([
    "detect", "config", "backups", "keys", "logs", "runtime/:toolId", "guide-settings/:toolId",
    "antigravity-mitm", "antigravity-mitm/alias", "openclaw/auto-order", "claude-settings",
    "cline-settings", "codewhale-settings", "crush-settings", "droid-settings", "grok-build-settings",
    "hermes-agent-settings", "jcode-settings", "kilo-settings", "letta-settings", "omp-settings",
    "openclaw-settings", "qwen-settings", "smelt-settings",
  ])
  migratedGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.dispatch(request));
  }

  @Post([
    "config", "apply", "backups", "guide-settings/:toolId", "antigravity-mitm", "claude-settings",
    "cline-settings", "codewhale-settings", "crush-settings", "droid-settings", "grok-build-settings",
    "hermes-agent-settings", "jcode-settings", "kilo-settings", "letta-settings", "omp-settings",
    "openclaw-settings", "qwen-settings", "smelt-settings",
  ])
  migratedPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.dispatch(request));
  }

  @Delete([
    "backups", "antigravity-mitm", "claude-settings", "cline-settings", "codewhale-settings",
    "crush-settings", "droid-settings", "grok-build-settings", "jcode-settings", "kilo-settings",
    "letta-settings", "omp-settings", "openclaw-settings", "qwen-settings", "smelt-settings",
  ])
  migratedDelete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.dispatch(request));
  }

  @Put("antigravity-mitm/alias")
  migratedPut(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.dispatch(request));
  }

  /** Catch-all for CLI tool routes that are implemented as app-owned handlers. */
  @All("*")
  catchAll(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.cliTools.dispatch(request));
  }
}
