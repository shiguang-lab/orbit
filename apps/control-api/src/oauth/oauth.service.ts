import { Injectable } from "@nestjs/common";
import {
  cliProxyImportGet,
  cliProxyImportPost,
  codexImportPost,
  codexImportTokenPost,
  cursorAutoImportGet,
  cursorImportGet,
  cursorImportPost,
  cursorLoginCancelPost,
  cursorLoginPollPost,
  cursorLoginStartPost,
  kiroApiKeyPost,
  kiroAutoImportGet,
  kiroImportPost,
  kiroSocialAuthorizeGet,
  kiroSocialExchangePost,
  oauthFlowGet,
  oauthFlowPost,
  pasteCredentialsPost,
  traeImportGet,
  traeImportPost,
} from "@shiguang-gateway/core-domain/control/oauth-handlers";

type OAuthParams = Record<string, string>;
type OAuthHandler = (request: Request, context?: { params: OAuthParams }) => Promise<Response> | Response;

/** Application use-case boundary for provider OAuth flows. */
@Injectable()
export class OAuthService {
  private dispatch(handler: OAuthHandler, request: Request, params: OAuthParams = {}) {
    return handler(request, { params });
  }

  oauthFlowGet(request: Request, params: OAuthParams) { return this.dispatch(oauthFlowGet, request, params); }
  oauthFlowPost(request: Request, params: OAuthParams) { return this.dispatch(oauthFlowPost, request, params); }
  pasteCredentials(request: Request, params: OAuthParams) { return this.dispatch(pasteCredentialsPost, request, params); }
  cliProxyImportGet(request: Request) { return this.dispatch(cliProxyImportGet, request); }
  cliProxyImportPost(request: Request) { return this.dispatch(cliProxyImportPost, request); }
  codexImportToken(request: Request) { return this.dispatch(codexImportTokenPost, request); }
  codexImport(request: Request) { return this.dispatch(codexImportPost, request); }
  cursorAutoImport(request: Request) { return this.dispatch(cursorAutoImportGet, request); }
  cursorImportGet(request: Request) { return this.dispatch(cursorImportGet, request); }
  cursorImportPost(request: Request) { return this.dispatch(cursorImportPost, request); }
  cursorLoginCancel(request: Request) { return this.dispatch(cursorLoginCancelPost, request); }
  cursorLoginPoll(request: Request) { return this.dispatch(cursorLoginPollPost, request); }
  cursorLoginStart(request: Request) { return this.dispatch(cursorLoginStartPost, request); }
  kiroApiKey(request: Request) { return this.dispatch(kiroApiKeyPost, request); }
  kiroAutoImport(request: Request) { return this.dispatch(kiroAutoImportGet, request); }
  kiroImport(request: Request) { return this.dispatch(kiroImportPost, request); }
  kiroSocialAuthorize(request: Request) { return this.dispatch(kiroSocialAuthorizeGet, request); }
  kiroSocialExchange(request: Request) { return this.dispatch(kiroSocialExchangePost, request); }
  traeImportGet(request: Request) { return this.dispatch(traeImportGet, request); }
  traeImportPost(request: Request) { return this.dispatch(traeImportPost, request); }
}
