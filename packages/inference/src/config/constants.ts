import { getUpstreamTimeoutConfig } from "@orbit/config/timeouts";
export { HTTP_STATUS } from "@orbit/contracts/http-status";
import { resolveProviderProfiles } from "@orbit/contracts/resilience-defaults";
export { DEFAULT_API_LIMITS, STREAM_THROUGHPUT_WATCHDOG } from "@orbit/contracts/resilience-defaults";
import { resolvePublicCred } from "../utils/publicCreds.ts";
import type { LegacyProvider } from "./providerRegistry.ts";
import { loadProviderCredentials } from "./credentialLoader.ts";
import { generateLegacyProviders } from "./providerRegistry.ts";

const upstreamTimeouts = getUpstreamTimeoutConfig(process.env, (message) => {
  console.warn(`[open-sse] ${message}`);
});

// Timeout for receiving the initial upstream response (ms).
// After headers arrive, active SSE streams are governed by STREAM_IDLE_TIMEOUT_MS
// and Undici's bodyTimeout instead of this one-shot startup timer.
export const FETCH_TIMEOUT_MS = upstreamTimeouts.fetchTimeoutMs;

// Idle timeout for SSE streams (ms). Before a stream is accepted, the same
// budget is used to wait for the first useful event so HTTP 200 zombie streams
// can fail fast and trigger fallback. After startup, it closes streams that go
// idle for this duration. Override with STREAM_IDLE_TIMEOUT_MS env var.
export const STREAM_IDLE_TIMEOUT_MS = upstreamTimeouts.streamIdleTimeoutMs;

// Grace period (ms) a client-disconnect finalization waits for the stream's own
// completion bookkeeping to land before persisting a 499. See #9653 — a client
// that closes right after reading a fully-completed SSE stream can otherwise
// race Orbit's own completion callback, resulting in a false 499 with zero
// token usage for a request that actually delivered its full response. Set
// STREAM_DISCONNECT_GRACE_PERIOD_MS=0 to disable and restore the old
// immediate-fail behavior.
export const STREAM_DISCONNECT_GRACE_PERIOD_MS = upstreamTimeouts.streamDisconnectGracePeriodMs;

// Timeout for the first non-ping SSE event. Inherits REQUEST_TIMEOUT_MS when
// set, unless STREAM_READINESS_TIMEOUT_MS is specified directly. This must stay
// conservative for large prompts and slow first-byte reasoning providers.
export const STREAM_READINESS_TIMEOUT_MS = upstreamTimeouts.streamReadinessTimeoutMs;

// Upper bound for adaptive stream readiness extensions (large histories,
// tool-heavy requests, high-reasoning Codex targets). Override with
// STREAM_READINESS_MAX_TIMEOUT_MS when an operator needs longer first-event
// windows for slow-thinking agent workloads.
export const STREAM_READINESS_MAX_TIMEOUT_MS = upstreamTimeouts.streamReadinessMaxTimeoutMs;

// Error code used when an upstream Antigravity request stalls before response
// headers are returned. Keep it shared so executor, core normalization and
// account fallback detection cannot drift.
export const ANTIGRAVITY_PRE_RESPONSE_TIMEOUT_CODE = "ANTIGRAVITY_PRE_RESPONSE_TIMEOUT";

// Heartbeat interval for synthetic SSE keepalive emission toward the downstream
// client (Capy, Claude Code, OpenAI SDK, etc). Keeps strict proxies from
// dropping the connection during long upstream thinking phases. Set to 0 to
// disable. Override with SSE_HEARTBEAT_INTERVAL_MS env var.
export const SSE_HEARTBEAT_INTERVAL_MS = upstreamTimeouts.sseHeartbeatIntervalMs;

// Timeout for reading the full response body after headers arrive (ms).
// Prevents indefinite hangs when the upstream sends headers but stalls on the body.
// Defaults to FETCH_TIMEOUT_MS. Override with FETCH_BODY_TIMEOUT_MS env var.
export const FETCH_BODY_TIMEOUT_MS = upstreamTimeouts.fetchBodyTimeoutMs;

// Provider configurations
// OAuth credentials read from env vars with hardcoded fallbacks for backward compatibility.
// Use provider-credentials.json or env vars to override in production.
// Lazy PROVIDERS: deferred until first property access to speed up startup.
// The Proxy defers `generateLegacyProviders()` + `loadProviderCredentials()`
// from module-evaluation time to the first read of any provider property.
let _providers: Record<string, LegacyProvider> | null = null;
function initProviders(): Record<string, LegacyProvider> {
  if (!_providers) {
    const p = generateLegacyProviders();
    loadProviderCredentials(p);
    _providers = p;
  }
  return _providers;
}

export const PROVIDERS: Record<string, LegacyProvider> = new Proxy(
  {} as Record<string, LegacyProvider>,
  {
    get(_, prop) {
      if (typeof prop === "symbol") return undefined;
      return Reflect.get(initProviders(), prop, _providers);
    },
    has(_, prop) {
      if (typeof prop === "symbol") return false;
      return Reflect.has(initProviders(), prop);
    },
    ownKeys() {
      return Reflect.ownKeys(initProviders());
    },
    getOwnPropertyDescriptor(_, prop) {
      if (typeof prop === "symbol") return undefined;
      return Object.getOwnPropertyDescriptor(initProviders(), prop);
    },
    set(_, prop, value) {
      if (typeof prop === "symbol") return false;
      (initProviders() as Record<string, LegacyProvider>)[prop] = value;
      return true;
    },
    deleteProperty(_, prop) {
      if (typeof prop === "symbol") return false;
      return Reflect.deleteProperty(initProviders(), prop);
    },
  }
);

// Claude system prompt
export const CLAUDE_SYSTEM_PROMPT = "You are Claude Code, Anthropic's official CLI for Claude.";

// Antigravity default system prompt (required for API to work)
export const ANTIGRAVITY_DEFAULT_SYSTEM =
  "You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.\n" +
  "You are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.\n" +
  "**Absolute paths only**\n" +
  "**Proactiveness**";

// OAuth endpoints
export const OAUTH_ENDPOINTS = {
  google: {
    token: "https://oauth2.googleapis.com/token",
    auth: "https://accounts.google.com/o/oauth2/auth",
  },
  openai: {
    token: "https://auth.openai.com/oauth/token",
    auth: "https://auth.openai.com/oauth/authorize",
  },
  anthropic: {
    token: "https://api.anthropic.com/v1/oauth/token",
    auth: "https://api.anthropic.com/v1/oauth/authorize",
  },
  qoder: {
    token: process.env.QODER_OAUTH_TOKEN_URL || "",
    auth: process.env.QODER_OAUTH_AUTHORIZE_URL || "",
  },
  github: {
    token: "https://github.com/login/oauth/access_token",
    auth: "https://github.com/login/oauth/authorize",
    deviceCode: "https://github.com/login/device/code",
  },
  openference: {
    token: "https://openference.com/oauth/token",
    auth: "https://openference.com/app/oauth/authorize",
    clientId: resolvePublicCred("openference_id"),
  },
};

// Cache TTLs (seconds)
export const CACHE_TTL = {
  userInfo: 300, // 5 minutes
  modelAlias: 3600, // 1 hour
};

// Default max tokens
export const DEFAULT_MAX_TOKENS = 64000;

// Minimum max tokens for tool calling (to prevent truncated arguments)
export const DEFAULT_MIN_TOKENS = 32000;

export const PROVIDER_MAX_TOKENS: Record<string, number> = {
  groq: 16384, // Groq strict per-model enforcement
  openai: 16384, // GPT-4/4o standard
  anthropic: 65536, // Claude models
  gemini: 65536, // Gemini Studio
  sensenova: 65536, // SenseNova Token Plan rejects MaxTokens outside [1, 65536]
};

export const DEFAULT_PROVIDER_MAX_TOKENS = 32000;

/**
 * #10360 — stable error code for an INTERNAL violation of the executor
 * `execute()` result contract (`normalizeExecutorResult` received something
 * that is neither a Response nor `{ response: Response }`).
 *
 * This is our own bug, never a provider/account health signal, so every
 * resilience layer must treat it as request-scoped and terminal: no connection
 * cooldown, no provider circuit-breaker trip, no retry. It rides on the error's
 * `.code` (read by `getUpstreamErrorIdentifier`) and therefore reaches
 * `checkFallbackError` as `structuredError.code` and the chat/combo predicates
 * as `result.errorCode`.
 *
 * Lives here (leaf config module) so both `open-sse/handlers/` and
 * `open-sse/services/` can import it without creating a cycle.
 */
export const EXECUTOR_CONTRACT_VIOLATION_CODE = "executor_contract_violation";

export {
  BACKOFF_CONFIG,
  COOLDOWN_MS,
  DEFAULT_ERROR_MESSAGES,
  ERROR_RULES,
  ERROR_TYPES,
  TRANSIENT_COOLDOWN_MS,
  calculateBackoffCooldown,
  findMatchingErrorRule,
  getDefaultErrorMessage,
  getErrorInfo,
  matchErrorRuleByStatus,
  matchErrorRuleByText,
} from "./errorConfig.ts";

// Configurable backoff steps for rate limits (Phase 1 — enhanced rate limiting)
// Used for per-model lockouts with increasing severity
export const BACKOFF_STEPS_MS = [60_000, 120_000, 300_000, 600_000, 1_200_000];
// 1min → 2min → 5min → 10min → 20min

// Structured error classification for rate limiting decisions
export const RateLimitReason = {
  QUOTA_EXHAUSTED: "quota_exhausted", // Daily/monthly quota depleted
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded", // RPM/RPD limits hit
  MODEL_CAPACITY: "model_capacity", // Model overloaded (529, 503)
  SERVER_ERROR: "server_error", // 5xx errors
  AUTH_ERROR: "auth_error", // 401, 403
  UNKNOWN: "unknown",
};

// ─── Provider Resilience Profiles ───────────────────────────────────────────
// Separate behavior for OAuth (low-limit, session-based) vs API Key (high-limit, metered)
// Circuit-breaker thresholds and reset windows are overridable via
// ORBIT_CIRCUIT_BREAKER_* env vars so operators can dampen or harden
// behavior without recompiling.
export const PROVIDER_PROFILES = resolveProviderProfiles(process.env);

// Default rate limit values for API Key providers (auto-enabled safety net)
// These are intentionally HIGH — they won't restrict normal usage.
// Real limits are learned from provider response headers.

// Skip patterns - requests containing these texts will bypass provider
export const SKIP_PATTERNS = ["Please write a 5-10 word title for the following conversation:"];

// Default maximum number of tools allowed in a request (OpenAI default)
export const MAX_TOOLS_LIMIT = 128;

// ── Credential Health Check ────────────────────────────────────────

/**
 * Interval (ms) for the background credential health check scheduler.
 * Default: 300000 (5 minutes). Minimum: 10000 (10 seconds).
 */
export const CREDENTIAL_HEALTH_CHECK_INTERVAL = (() => {
  const raw = process.env.CREDENTIAL_HEALTH_CHECK_INTERVAL;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 10_000) return parsed;
  }
  return 300_000;
})();

/**
 * TTL (ms) for cached credential health status.
 * After this time, the cache entry expires and the next request will
 * re-check. Default: 300000 (5 minutes).
 */
export const CREDENTIAL_HEALTH_CACHE_TTL = (() => {
  const raw = process.env.CREDENTIAL_HEALTH_CACHE_TTL;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 10_000) return parsed;
  }
  return 300_000;
})();

/**
 * Stream-recovery tuning (opt-in, see ResilienceSettings.streamRecovery).
 *
 * Ported from free-claude-code's always-on recovery (`core/anthropic/stream_recovery.py`).
 * In Orbit the holdback is disabled by default because buffering the opening
 * window adds up to HOLDBACK_MS of time-to-first-token latency on every stream;
 * operators opt in via STREAM_RECOVERY_ENABLED / the resilience settings.
 *
 * - HOLDBACK_MS: how long the opening SSE window is held so an early truncation
 *   can be retried transparently before any byte reaches the client.
 * - BUFFER_MAX_BYTES: hard cap on the held window — commit (flush + passthrough)
 *   as soon as this many bytes accumulate, regardless of the timer.
 * - EARLY_RETRY_MAX: max transparent re-opens of the upstream stream while the
 *   holdback is still uncommitted (free-claude-code uses 5 total attempts = 4 retries).
 */
export const STREAM_RECOVERY = {
  HOLDBACK_MS: 750,
  BUFFER_MAX_BYTES: 65536,
  EARLY_RETRY_MAX: 4,
  /**
   * Minimum character overlap `trimContinuationOverlap` must find between the
   * already-emitted text and a mid-stream continuation for the continuation to be
   * accepted as a real resume, rather than an unrelated restart the model produced after
   * ignoring the assistant-prefill.
   *
   * This is a DOCUMENTED TRADE-OFF, not a solved distinction: a model that continues
   * cleanly with fewer than this many echoed characters (a legitimate, even preferred,
   * outcome — there was nothing to de-duplicate) is indistinguishable, from string data
   * alone, from a model that silently restarted on an unrelated sentence. Both produce a
   * low/zero overlap. Rejecting below this threshold trades some false-positive rejections
   * of legitimate low-overlap continuations (bounded retry, then a clean close — no data
   * loss beyond that retry) against not silently gluing two unrelated fragments into one
   * corrupted, unrecoverable answer. It does not eliminate the residual false negative
   * either (an accidental coincidence at or above this many characters is still accepted).
   */
  MIN_CONTINUATION_OVERLAP_CHARS: 8,
} as const;

/**
 * Active-stream quality watchdog defaults (#9709). This is separate from the
 * idle timeout (no chunks) and the absolute upstream-attempt deadline: it only
 * evaluates useful assistant output after warm-up plus one complete window.
 */
