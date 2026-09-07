import { Injectable } from "@nestjs/common";
import { getLiveWsPath, resolveLiveWsPublicUrl } from "./ws-path.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

@Injectable()
export class WsService {
  async handleWs(req: Request): Promise<Response> {
    const [handshakeModule, corsModule] = await Promise.all([
      load("@orbit/core/edge/ws-handshake"),
      load("@orbit/core/shared/cors"),
    ]);
    const { authorizeWebSocketHandshake } = handshakeModule;
    const { CORS_HEADERS } = corsModule;
    const headers = { ...CORS_HEADERS, "Cache-Control": "no-store" };
    const auth = await authorizeWebSocketHandshake(req);
    if (new URL(req.url).searchParams.get("handshake") !== "1") {
      return Response.json(
        { error: { message: "Upgrade Required", type: "invalid_request", code: "upgrade_required" }, path: auth.wsPath, wsAuth: auth.wsAuth },
        { status: 426, headers: { ...headers, Upgrade: "websocket" } },
      );
    }
    if (!auth.authorized) {
      return Response.json(
        { error: { message: auth.hasCredential ? "Invalid WebSocket credential" : "WebSocket auth required", type: "invalid_request", code: auth.hasCredential ? "ws_auth_invalid" : "ws_auth_required" }, wsAuth: auth.wsAuth, path: auth.wsPath },
        { status: auth.hasCredential ? 403 : 401, headers },
      );
    }
    return Response.json(
      {
        ok: true,
        path: auth.wsPath,
        wsAuth: auth.wsAuth,
        authenticated: auth.authenticated,
        authType: auth.authType,
        protocol: {
          request: { type: "request", id: "req-1", payload: { model: "openai/gpt-4.1-mini", messages: [] } },
          cancel: { type: "cancel", id: "req-1" },
          live: { port: parseInt(process.env.LIVE_WS_PORT || "20132", 10), publicUrl: resolveLiveWsPublicUrl(), path: getLiveWsPath(), protocol: "json", channels: ["requests", "combo", "credentials"], auth: "api-key", heartbeatMs: 15000 },
        },
        live: { port: parseInt(process.env.LIVE_WS_PORT || "20132", 10), publicUrl: resolveLiveWsPublicUrl(), path: getLiveWsPath(), protocol: "json", auth: "api-key", description: "Real-time dashboard events via WebSocket" },
      },
      { headers },
    );
  }
}
