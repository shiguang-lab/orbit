/**
 * OAuth use-case handlers shared by the control transport.  These functions
 * operate on Web Request/Response objects so the Nest adapter can keep the
 * provider-specific OAuth behavior isolated from HTTP route registration.
 */
export {
  GET as oauthFlowGet,
  POST as oauthFlowPost,
} from "../app/api/oauth/[provider]/[action]/handler.ts";
export { POST as pasteCredentialsPost } from "../app/api/oauth/[provider]/paste-credentials/handler.ts";
export {
  GET as cliProxyImportGet,
  POST as cliProxyImportPost,
} from "../app/api/oauth/cliproxy-import/handler.ts";
export { POST as codexImportTokenPost } from "../app/api/oauth/codex/import-token/handler.ts";
export { POST as codexImportPost } from "../app/api/oauth/codex/import/handler.ts";
export { GET as cursorAutoImportGet } from "../app/api/oauth/cursor/auto-import/handler.ts";
export {
  GET as cursorImportGet,
  POST as cursorImportPost,
} from "../app/api/oauth/cursor/import/handler.ts";
export { POST as cursorLoginCancelPost } from "../app/api/oauth/cursor/login/cancel/handler.ts";
export { POST as cursorLoginPollPost } from "../app/api/oauth/cursor/login/poll/handler.ts";
export { POST as cursorLoginStartPost } from "../app/api/oauth/cursor/login/start/handler.ts";
export { POST as kiroApiKeyPost } from "../app/api/oauth/kiro/api-key/handler.ts";
export { GET as kiroAutoImportGet } from "../app/api/oauth/kiro/auto-import/handler.ts";
export { POST as kiroImportPost } from "../app/api/oauth/kiro/import/handler.ts";
export { GET as kiroSocialAuthorizeGet } from "../app/api/oauth/kiro/social-authorize/handler.ts";
export { POST as kiroSocialExchangePost } from "../app/api/oauth/kiro/social-exchange/handler.ts";
export {
  GET as traeImportGet,
  POST as traeImportPost,
} from "../app/api/oauth/trae/import/handler.ts";
