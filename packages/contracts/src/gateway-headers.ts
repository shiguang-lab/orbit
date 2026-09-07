/**
 * Response metadata headers emitted by gateway applications.
 *
 * This is a transport contract, not an implementation detail of the legacy
 * core package. Edge, control and streaming components can all depend
 * on the same canonical header names without importing another app's source.
 */
export const ORBIT_RESPONSE_HEADERS = {
  cache: "X-Orbit-Cache",
  cacheHit: "X-Orbit-Cache-Hit",
  cacheLatency: "X-Orbit-Cache-Latency",
  compression: "X-Orbit-Compression",
  costSaved: "X-Orbit-Cost-Saved",
  decision: "X-Orbit-Decision",
  fallbackAttempts: "X-Orbit-Fallback-Attempts",
  latencyMs: "X-Orbit-Latency-Ms",
  model: "X-Orbit-Model",
  progress: "X-Orbit-Progress",
  provider: "X-Orbit-Provider",
  requestId: "X-Orbit-Request-Id",
  responseCost: "X-Orbit-Response-Cost",
  tokensIn: "X-Orbit-Tokens-In",
  tokensOut: "X-Orbit-Tokens-Out",
  version: "X-Orbit-Version",
} as const;
