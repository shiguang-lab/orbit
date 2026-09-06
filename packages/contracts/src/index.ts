/**
 * @shiguang-gateway/contracts
 * 前后端(BFF)共享的 API 契约与领域类型。
 * 这些类型与 Shiguang Gateway 后端的接口保持手工镜像(lightweight mirror)，
 * 后端路由变更时优先在此同步。
 */

/* ---------------- 认证 ---------------- */

export interface RequireLoginInfo {
  authenticated: boolean;
  requireLogin: boolean;
  hasPassword: boolean;
  setupComplete: boolean;
  oidcEnabled: boolean;
  oidcDisablePasswordLogin: boolean;
  nodeVersion?: string;
  nodeCompatible?: boolean;
}

/** shiguang 统一登录后的会话(由 auth-service /api/auth/session 返回) */
export interface UnifiedSessionResponse {
  authenticated?: boolean;
  subject?: string;
  displayName?: string;
  email?: string;
  preferredUsername?: string;
  organization?: { id: string; name: string } | null;
  roles?: string[];
  platformRoles?: string[];
  entitlements?: string[];
  user?: {
    id: string;
    username: string;
    tenantType?: "user" | "org";
    tenantId?: string;
    orgId?: string;
    orgRoles?: string[];
  };
}

export interface AuthSession {
  id: string;
  displayName: string;
  email: string | null;
  roles: string[];
  platformRoles: string[];
}

/* ---------------- Providers ---------------- */

export interface ProviderConnection {
  id: string;
  provider: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  status?: string;
  enabled?: boolean;
  priority?: number;
  [key: string]: unknown;
}

export interface ProviderListResponse {
  connections: ProviderConnection[];
  total: number;
}

/* ---------------- Usage / Logs ---------------- */

export interface CallLogEntry {
  id: string;
  model?: string;
  provider?: string;
  status?: string;
  duration?: number;
  tokens_in?: number;
  tokens_out?: number;
  timestamp?: string;
  apiKey?: string;
  combo?: string;
  correlationId?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Stable error envelope used when every credential for a model is cooling down.
 * Keep this transport contract independent from the persistence/domain packages
 * so edge applications can use the streaming error helper without importing
 * the legacy core-domain source tree.
 */
export interface ModelCooldownErrorPayload {
  error: {
    message: string;
    type: "rate_limit_error";
    code: "model_cooldown";
    model?: string;
    reset_seconds: number;
    retry_after?: string;
    credentials_cooling?: number;
  };
}

/* ---------------- 系统 ---------------- */

export interface SystemVersionInfo {
  version: string;
  updateAvailable?: boolean;
  latest?: string;
  [key: string]: unknown;
}

/* ---------------- 长连接 ---------------- */

export type LiveChannel = "requests" | "combo" | "credentials" | "compression";

export interface LiveEvent {
  channel: string;
  event: string;
  data: unknown;
  timestamp?: number;
}

export interface WsHandshakeLiveInfo {
  port?: number;
  publicUrl?: string | null;
  path?: string;
  protocol?: string;
  channels?: string[];
  auth?: string;
  heartbeatMs?: number;
}

export type {
  WsAuthResult,
  WsClientMessage,
  WsErrorMessage,
  WsEventMessage,
  WsPingMessage,
  WsPongMessage,
  WsServerMessage,
  WsSubscribeMessage,
  WsWelcomeMessage,
} from "./realtime.js";

/* ---------------- Combos ---------------- */

export interface ComboModelStep {
  id: string;
  kind?: "model";
  model: string;
  providerId?: string | null;
  connectionId?: string | null;
  allowedConnectionIds?: string[] | null;
  weight: number;
  label?: string;
  prompt?: string | null;
  tags?: string[];
  fallbackOnlyOnQuotaExhaustion?: boolean;
}

export interface ComboRefStep {
  id: string;
  kind: "combo-ref";
  comboName: string;
  weight: number;
  label?: string;
  fallbackOnlyOnQuotaExhaustion?: boolean;
}

export interface ComboProviderWildcardStep {
  id: string;
  kind: "provider-wildcard";
  providerId: string;
  modelPattern: string;
  connectionId?: string | null;
  allowedConnectionIds?: string[] | null;
  weight: number;
  label?: string;
}

export type ComboStep = ComboModelStep | ComboRefStep | ComboProviderWildcardStep;

export interface ComboItem {
  id: string;
  name: string;
  strategy: string;
  models: ComboStep[];
  config?: Record<string, unknown>;
  isActive?: boolean;
  isHidden?: boolean;
  description?: string;
  system_message?: string;
  tool_filter_regex?: string;
  context_cache_protection?: boolean;
  context_length?: number | null;
  computed_context_length?: number | null;
  sort_order?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ComboListResponse {
  combos: ComboItem[];
  total: number;
}

export interface ComboMetrics {
  totalRequests?: number;
  totalSuccesses?: number;
  totalFailures?: number;
  totalFallbacks?: number;
  avgLatencyMs?: number;
  successRate?: number;
  fallbackRate?: number;
  lastUsedAt?: string | null;
  [key: string]: unknown;
}

export * from "./routing-strategies.js";
export * from "./responses-state.js";
export * from "./responses-store.js";
export * from "./reasoning-effort.js";
export * from "./claude-code-client.js";
export * from "./codex-client.js";
export * from "./vision-models.js";
export * from "./upstream-headers.js";
export * from "./designer-web-retirement.js";
export * from "./provider-retirement.js";
export * from "./chatgpt-web-retirement.js";
export * from "./cli-compat.js";
export * from "./formatting.js";
export * from "./config/providerCatalog.js";
export * from "./config/noAuthProviders.js";

export interface ComboBuilderModelOption {
  id: string;
  qualifiedModel: string;
  name: string;
  source: string;
  sources: string[];
  supportedEndpoints?: string[];
  apiFormat?: string;
  contextLength?: number;
  outputTokenLimit?: number;
  supportsThinking?: boolean;
}

export interface ComboBuilderConnectionOption {
  id: string;
  label: string;
  type: string;
  status: string;
  priority: number;
  isActive: boolean;
  defaultModel?: string | null;
  rateLimitedUntil?: number | null;
  lastError?: string | null;
  lastTested?: string | null;
}

export interface ComboBuilderProviderOption {
  providerId: string;
  providerType: string;
  displayName: string;
  alias: string;
  prefix?: string | null;
  icon: string;
  color: string;
  source: string;
  acceptsArbitraryModel: boolean;
  connectionCount: number;
  activeConnectionCount: number;
  modelCount: number;
  models: ComboBuilderModelOption[];
  connections: ComboBuilderConnectionOption[];
}

export interface ComboBuilderOptions {
  providers: ComboBuilderProviderOption[];
  comboRefs: Array<{
    id?: string;
    name: string;
    strategy?: string;
    modelsCount?: number;
  }>;
}

export interface ComboTestResultItem {
  model: string;
  provider: string;
  stepId?: string;
  executionKey?: string;
  connectionId?: string | null;
  label?: string;
  status: "ok" | "error" | "skipped";
  statusCode?: number;
  latencyMs?: number;
  error?: string;
  responseText?: string;
}

export interface ComboTestResponse {
  resolvedBy?: string;
  resolvedByTarget?: {
    connectionId?: string | null;
    stepId?: string | null;
    [key: string]: unknown;
  };
  results?: ComboTestResultItem[];
  error?: string;
}
