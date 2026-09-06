import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { isLocalRequestAllowed } from "../src/local-redis/local-endpoints.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalEnabled = process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_ENABLED;
const originalToken = process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_TOKEN;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalEnabled === undefined) delete process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_ENABLED;
  else process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_ENABLED = originalEnabled;
  if (originalToken === undefined) delete process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_TOKEN;
  else process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_TOKEN = originalToken;
  delete (globalThis as { __omniRequestHeaders?: Headers }).__omniRequestHeaders;
});

function injectHeaders(values: HeadersInit): void {
  (globalThis as { __omniRequestHeaders?: Headers }).__omniRequestHeaders = new Headers(values);
}

test("allows direct IPv4, IPv6, and localhost requests", () => {
  for (const host of ["localhost:8788", "127.0.0.1:8788", "::1", "[::1]:8788"]) {
    injectHeaders({ host });
    assert.deepEqual(isLocalRequestAllowed(), { allowed: true });
  }
});

test("rejects non-local hosts and forwarded public origins", () => {
  injectHeaders({ host: "gateway.example" });
  assert.deepEqual(isLocalRequestAllowed(), { allowed: false, reason: "non-local origin" });

  injectHeaders({ host: "127.0.0.1:8788", "x-forwarded-for": "203.0.113.5, 127.0.0.1" });
  assert.deepEqual(isLocalRequestAllowed(), { allowed: false, reason: "non-local origin" });
});

test("allows only the exact configured desktop bearer token", () => {
  process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_TOKEN = "desktop-secret";
  injectHeaders({ host: "gateway.example", authorization: "bearer desktop-secret" });
  assert.deepEqual(isLocalRequestAllowed(), { allowed: true });

  injectHeaders({ host: "gateway.example", authorization: "Bearer desktop-secret-extra" });
  assert.deepEqual(isLocalRequestAllowed(), { allowed: false, reason: "non-local origin" });
});

test("preserves the production opt-in fallback when request headers are unavailable", () => {
  process.env.NODE_ENV = "production";
  assert.deepEqual(isLocalRequestAllowed(), { allowed: false, reason: "disabled in production" });

  process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_ENABLED = "1";
  assert.deepEqual(isLocalRequestAllowed(), { allowed: true });

  process.env.NODE_ENV = "development";
  delete process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_ENABLED;
  assert.deepEqual(isLocalRequestAllowed(), { allowed: true });
});
