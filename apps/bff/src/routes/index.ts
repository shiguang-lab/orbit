/**
 * 路由注册中心：按原 src/app/api/ 的一级目录组织，逐组迁移。
 * 每个 route 文件对应原 src/app/api/<group>/ 下的 handler，行为保持一致。
 */
import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes, type AuthEngine } from "./auth.js";
import { providerRoutes, type ProviderEngine } from "./providers.js";
import { providerNodeRoutes, type ProviderNodeEngine } from "./provider-nodes.js";
import { settingsRoutes, type SettingsEngine } from "./settings.js";
import { keyRoutes, type KeyEngine } from "./keys.js";
import { homeRoutes, type HomeEngine } from "./home.js";
import { comboRoutes, type ComboEngine } from "./combos.js";
import { analyticsRoutes, type AnalyticsEngine } from "./analytics.js";
import { gamificationRoutes } from "./gamification.js";
import { batchRoutes } from "./batch.js";
import { mediaRoutes } from "./media.js";
import { runtimeRoutes } from "./runtime.js";
import type { LocalAuthBroker } from "../lib/broker.js";

export interface RouteEngines {
  auth?: AuthEngine;
  providers?: ProviderEngine;
  providerNodes?: ProviderNodeEngine;
  settings?: SettingsEngine;
  keys?: KeyEngine;
  home?: HomeEngine;
  combos?: ComboEngine;
  analytics?: AnalyticsEngine;
}

export interface RouteOptions {
  engines?: RouteEngines;
  /** 本地开发免登录(仅 SG_DEV_IDENTITY=1 时注入 dev 身份) */
  devBypass?: boolean;
  /** 本地 SSO broker(用真实 shiguang 账号换身份) */
  broker?: LocalAuthBroker;
  officialRemoteAuth?: boolean;
  officialAuth?: boolean;
}

export async function routes(app: FastifyInstance, opts: RouteOptions = {}): Promise<void> {
  const { engines = {}, devBypass = false, broker } = opts;

  // 无引擎依赖的路由
  await app.register(healthRoutes, { prefix: "/api" });
  if (!opts.officialRemoteAuth) {
    await app.register(authRoutes, { prefix: "/api", engine: engines.auth, devBypass, broker, officialAuth: opts.officialAuth });
  }
  await app.register(providerRoutes, { prefix: "/api", engine: engines.providers });
  await app.register(providerNodeRoutes, { prefix: "/api", engine: engines.providerNodes });
  await app.register(settingsRoutes, { prefix: "/api", engine: engines.settings });
  await app.register(keyRoutes, { prefix: "/api", engine: engines.keys });
  await app.register(homeRoutes, { prefix: "/api", engine: engines.home });
  await app.register(comboRoutes, { prefix: "/api", engine: engines.combos });
  await app.register(analyticsRoutes, { prefix: "/api", engine: engines.analytics });
  await app.register(gamificationRoutes, { prefix: "/api" });
  await app.register(batchRoutes, { prefix: "/api" });
  await app.register(mediaRoutes, { prefix: "/api" });
  await app.register(runtimeRoutes, { prefix: "/api" });
}
