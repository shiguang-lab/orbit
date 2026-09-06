import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { FastifyInstance } from "fastify";
import {
  authzPlugin,
  csrfPlugin,
  type EngineAuthAdapter,
  LocalAuthBroker,
} from "@shiguang-gateway/auth";
import { installControlLocalOnlyGuard } from "./control-local-only.guard.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

@Injectable()
export class ControlSecurityService implements OnModuleInit {
  constructor(@Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost) {}

  onModuleInit(): Promise<void> {
    return this.register(this.adapterHost.httpAdapter.getInstance() as FastifyInstance);
  }

  async register(app: FastifyInstance): Promise<void> {
    installControlLocalOnlyGuard(app);

    app.addHook("preHandler", async (request, reply) => {
      const pathname = new URL(request.url, "http://control-api").pathname;
      const clientPath = pathname === "/api/v1" || pathname.startsWith("/api/v1/") ||
        pathname === "/api/v1beta" || pathname.startsWith("/api/v1beta/") ||
        pathname === "/api/a2a" || pathname.startsWith("/api/a2a/") ||
        pathname === "/v1" || pathname.startsWith("/v1/") ||
        pathname === "/v1beta" || pathname.startsWith("/v1beta/") ||
        pathname === "/a2a" || pathname.startsWith("/a2a/");
      if (clientPath) {
        return reply.status(404).send({
          error: { type: "not_found", message: "Route not found" },
          requestId: request.id,
        });
      }
    });

    const brokerRequested = process.env.SG_LOCAL_BROKER_ENABLED === "true";
    const brokerUsername = brokerRequested ? process.env.SG_BROKER_USERNAME ?? "" : "";
    const brokerPassword = brokerRequested ? process.env.SG_BROKER_PASSWORD ?? "" : "";
    if (brokerRequested && (!brokerUsername.trim() || !brokerPassword)) {
      throw new Error("SG_BROKER_USERNAME and SG_BROKER_PASSWORD are required when SG_LOCAL_BROKER_ENABLED=true");
    }
    const broker = new LocalAuthBroker({
      authTarget: process.env.SG_BROKER_AUTH_TARGET ?? "https://shiguanglab.com",
      loginName: brokerUsername,
      password: brokerPassword,
    });
    const devMode = process.env.SG_DEV_IDENTITY === "1" || broker.enabled;
    if (broker.enabled) app.log.info("[control-api] local SSO broker enabled");
    else if (devMode) app.log.info("[control-api] local dev identity enabled");

    const authzEngine: EngineAuthAdapter = {
      isValidApiKey: async (apiKey) => {
        try {
          const { isValidApiKey } = await load("@shiguang-gateway/open-sse/services/auth");
          return await isValidApiKey(apiKey);
        } catch {
          return false;
        }
      },
      getApiKeyMetadata: async (apiKey) => {
        try {
          const { getApiKeyMetadata } = await load("@shiguang-gateway/core-domain/db/api-keys");
          const meta = await getApiKeyMetadata(apiKey);
          return meta ? { scopes: meta.scopes ?? [], name: meta.name } : null;
        } catch {
          return null;
        }
      },
      isCliTokenAuthValid: async (request) => {
        try {
          const { isCliTokenAuthValid } = await load("@shiguang-gateway/core-domain/control/cli-token-auth");
          const headers = new Headers();
          for (const [name, value] of Object.entries(request.headers)) {
            if (typeof value === "string") headers.set(name, value);
            else if (Array.isArray(value)) {
              headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
            }
          }
          return await isCliTokenAuthValid(new Request(new URL(request.url ?? "/", "http://control-api"), { headers }));
        } catch {
          return false;
        }
      },
      getSettings: async () => {
        try {
          const { getSettings } = await load("@shiguang-gateway/core-domain/db/settings");
          return await getSettings();
        } catch {
          return {};
        }
      },
    };

    authzPlugin(app, { engine: authzEngine, devMode });
    csrfPlugin(app, { devMode });
    await this.registerAdminShell(app);
  }

  private async registerAdminShell(app: FastifyInstance): Promise<void> {
    const configuredRoot = process.env.ADMIN_STATIC_DIR?.trim();
    const adminRoot = configuredRoot || (existsSync("/app/apps/admin/dist")
      ? "/app/apps/admin/dist"
      : resolve(process.cwd(), "apps/admin/dist"));
    if (!existsSync(adminRoot)) return;
    const staticModule = await load("@fastify/" + "static");
    await app.register((staticModule.default ?? staticModule) as any, { root: adminRoot, wildcard: false });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api/") || request.url === "/api" || request.url.startsWith("/v1/") || request.url === "/v1" || request.url.startsWith("/v1beta/") || request.url === "/v1beta" || request.url.startsWith("/a2a") || request.url.startsWith("/.well-known/") || request.url.startsWith("/live-ws")) {
        return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return reply.status(404).send({ error: { type: "not_found", message: "Route not found" }, requestId: request.id });
      }
      return (reply as unknown as { sendFile: (name: string) => unknown }).sendFile("index.html");
    });
  }
}
