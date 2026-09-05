/**
 * 路由注册中心：按原 src/app/api/ 的一级目录组织，逐组迁移。
 * 每个 route 文件对应原 src/app/api/<group>/ 下的 handler，行为保持一致。
 */
import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes, type AuthEngine } from "./auth.js";
import { providerRoutes, publicProviderRoutes, type ProviderEngine } from "./providers.js";
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
import { freeProviderRankingsRoutes } from "./freeProviderRankings.js";
import { freeTierRoutes } from "./freeTier.js";
import { budgetRoutes } from "./budget.js";
import { pricingRoutes } from "./pricing.js";
import { cacheRoutes } from "./cache.js";
import { networkRoutes } from "./network.js";
import { tunnelRoutes } from "./tunnels.js";
import type { LocalAuthBroker } from "../lib/broker.js";
import { runtimeCatchallRoutes } from "./runtimeCatchall.js";

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
  localPasswordAuth?: boolean;
  /** Public API and management API can run as separate deployable surfaces. */
  surface?: "all" | "edge-gateway" | "control-api";
}

export async function routes(app: FastifyInstance, opts: RouteOptions = {}): Promise<void> {
  const surface = opts.surface ?? "all";
  // The local runtime route tree is the only production HTTP implementation.
  // It contains the complete migrated route surface; bespoke Fastify wrappers
  // are intentionally not registered because they can shadow a migrated route
  // with a reduced response or an unavailable placeholder.
  await runtimeCatchallRoutes(app, { surface });
}
