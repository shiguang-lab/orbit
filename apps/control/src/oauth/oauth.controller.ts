import { Controller, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { OAuthService } from "./oauth.service.js";

/** Nest transport registration for all control-plane OAuth endpoints. */
@Controller("api/oauth")
export class OAuthController {
  constructor(
    @Inject(OAuthService) private readonly oauth: OAuthService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Post(":provider/paste-credentials")
  pasteCredentials(@Param("provider") provider: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.pasteCredentials(req, { provider }), { provider });
  }

  @Get("cliproxy-import")
  cliProxyImportGet(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.cliProxyImportGet(req));
  }

  @Post("cliproxy-import")
  cliProxyImportPost(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.cliProxyImportPost(req));
  }

  @Post("codex/import-token")
  codexImportToken(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.codexImportToken(req));
  }

  @Post("codex/import")
  codexImport(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.codexImport(req));
  }

  @Get("cursor/auto-import")
  cursorAutoImport(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.cursorAutoImport(req));
  }

  @Get("cursor/import")
  cursorImportGet(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.cursorImportGet(req));
  }

  @Post("cursor/import")
  cursorImportPost(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.cursorImportPost(req));
  }

  @Post("cursor/login/cancel")
  cursorLoginCancel(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.cursorLoginCancel(req));
  }

  @Post("cursor/login/poll")
  cursorLoginPoll(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.cursorLoginPoll(req));
  }

  @Post("cursor/login/start")
  cursorLoginStart(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.cursorLoginStart(req));
  }

  @Post("kiro/api-key")
  kiroApiKey(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.kiroApiKey(req));
  }

  @Get("kiro/auto-import")
  kiroAutoImport(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.kiroAutoImport(req));
  }

  @Post("kiro/import")
  kiroImport(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.kiroImport(req));
  }

  @Get("kiro/social-authorize")
  kiroSocialAuthorize(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.kiroSocialAuthorize(req));
  }

  @Post("kiro/social-exchange")
  kiroSocialExchange(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.kiroSocialExchange(req));
  }

  @Get("trae/import")
  traeImportGet(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.traeImportGet(req));
  }

  @Post("trae/import")
  traeImportPost(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.traeImportPost(req));
  }

  @Get(":provider/:action")
  oauthFlowGet(
    @Param("provider") provider: string,
    @Param("action") action: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.oauthFlowGet(req, { provider, action }), { provider, action });
  }

  @Post(":provider/:action")
  oauthFlowPost(
    @Param("provider") provider: string,
    @Param("action") action: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, (req) => this.oauth.oauthFlowPost(req, { provider, action }), { provider, action });
  }
}
