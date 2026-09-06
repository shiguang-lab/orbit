/**
 * OAuth Provider Registry — Extracted from monolithic providers.js
 *
 * Each provider is now defined in its own module under providers/.
 * This index re-exports the full PROVIDERS map and utility functions.
 *
 * Provider modules follow the interface:
 *   { config, flowType, buildAuthUrl?, exchangeToken?, requestDeviceCode?, pollToken?, postExchange?, mapTokens }
 *
 * @module lib/oauth/providers/index
 */

import { claude } from "./claude.js";
import { codex } from "./codex.js";
import { antigravity } from "./antigravity.js";
import { agy } from "./agy.js";
import { qoder } from "./qoder.js";
import { kimiCoding } from "./kimi-coding.js";
import { github } from "./github.js";
import { gheCopilot } from "./ghe-copilot.js";
import { gitlabDuo } from "./gitlab-duo.js";
import { kiro } from "./kiro.js";
import { cursor } from "./cursor.js";
import { trae } from "./trae.js";
import { kilocode } from "./kilocode.js";
import { cline } from "./cline.js";
import { devinDesktop } from "./devin-desktop.js";
import { grokCli } from "./grok-cli.js";
import { xaiOauth } from "./xai-oauth.js";
import { openference } from "./openference.js";
import { codebuddyCn } from "./codebuddy-cn.js";
import { zed } from "./zed.js";
import { zedHosted } from "./zed-hosted.js";

export const PROVIDERS = {
  claude,
  codex,
  antigravity,
  agy,
  qoder,
  "kimi-coding": kimiCoding,
  github,
  "ghe-copilot": gheCopilot,
  "gitlab-duo": gitlabDuo,
  kiro,
  "amazon-q": kiro,
  cursor,
  trae,
  kilocode,
  cline,
  // clinepass reuses the Cline WorkOS OAuth flow 1:1 (same api.cline.bot host, same token
  // type) — it is a separate catalog entry advertising the cline-pass/* (ClinePass
  // subscription) models. See registry/clinepass/index.ts.
  clinepass: cline,
  "devin-desktop": devinDesktop,
  // Devin CLI shares the same imported token format and upstream credential contract.
  "devin-cli": devinDesktop,
  // grok-cli carries BOTH the browser PKCE flow and the paste-token import flow
  // under this one entry (#7013) — see grok-cli.ts's mapTokens for the dispatch.
  "grok-cli": grokCli,
  "xai-oauth": xaiOauth,
  openference,
  "codebuddy-cn": codebuddyCn,
  // Zed IDE credential bridge — uses keychain import, not standard OAuth
  zed,
  "zed-hosted": zedHosted,
};

export default PROVIDERS;
