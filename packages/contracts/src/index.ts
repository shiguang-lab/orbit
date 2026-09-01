/**
 * @omniroute/contracts
 * 前后端(BFF)共享的 API 契约与领域类型。
 * 这些类型与 OmniRoute 后端(Orbit vendor)的接口保持手工镜像(lightweight mirror)，
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

export interface ComboBuilderOptions {
  providers: Array<{
    providerId: string;
    name?: string;
    displayName?: string;
    providerName?: string;
    models?: Array<{ id: string; name?: string; qualifiedModel?: string }>;
    connections?: Array<{ id: string; label?: string; status?: string }>;
  }>;
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

