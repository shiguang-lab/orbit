/**
 * Response metadata headers emitted by gateway applications.
 *
 * This is a transport contract, not an implementation detail of the legacy
 * core package. Edge, control and streaming components can all depend
 * on the same canonical header names without importing another app's source.
 */
export const SHIGUANG_GATEWAY_RESPONSE_HEADERS = {
  cache: "X-ShiguangGateway-Cache",
  cacheHit: "X-ShiguangGateway-Cache-Hit",
  cacheLatency: "X-ShiguangGateway-Cache-Latency",
  compression: "X-ShiguangGateway-Compression",
  costSaved: "X-ShiguangGateway-Cost-Saved",
  decision: "X-ShiguangGateway-Decision",
  fallbackAttempts: "X-ShiguangGateway-Fallback-Attempts",
  latencyMs: "X-ShiguangGateway-Latency-Ms",
  model: "X-ShiguangGateway-Model",
  progress: "X-ShiguangGateway-Progress",
  provider: "X-ShiguangGateway-Provider",
  requestId: "X-ShiguangGateway-Request-Id",
  responseCost: "X-ShiguangGateway-Response-Cost",
  tokensIn: "X-ShiguangGateway-Tokens-In",
  tokensOut: "X-ShiguangGateway-Tokens-Out",
  version: "X-ShiguangGateway-Version",
} as const;
