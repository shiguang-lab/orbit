/**
 * Regression tests for upstream sync batch C (2026-09-11).
 * Covers pure helpers ported from upstream fixes:
 * - sanitizeFts5Query (#12231 / 26eeead26)
 * - withMeasuredDimensions (#12180 / 9327990be)
 * - preserveExistingCodexConnectionState (#12122 / 908c1b823)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeFts5Query } from "../src/lib/memory/retrieval/scoring.ts";
import { withMeasuredDimensions } from "../src/lib/memory/embeddingPort.ts";
import {
  preserveExistingCodexConnectionState,
  normalizeCodexImportRecord,
  type CodexImportPayload,
} from "../src/lib/oauth/services/codexImport.ts";

// ── sanitizeFts5Query ────────────────────────────────────────────────────────

test("sanitizeFts5Query strips FTS control operators and quotes terms", () => {
  assert.equal(sanitizeFts5Query('hello OR (world) AND "quoted"'), '"hello" "OR" "world" "AND" "quoted"');
  assert.equal(sanitizeFts5Query("  foo-bar  baz "), '"foo" "bar" "baz"');
});

test("sanitizeFts5Query returns empty for empty/symbol-only input", () => {
  assert.equal(sanitizeFts5Query(""), "");
  assert.equal(sanitizeFts5Query(undefined), "");
  assert.equal(sanitizeFts5Query('  ()[]{}"  '), "");
});

test("sanitizeFts5Query keeps accented latin letters", () => {
  assert.equal(sanitizeFts5Query("café résumé"), '"café" "résumé"');
});

// ── withMeasuredDimensions ───────────────────────────────────────────────────

function customResolution() {
  return {
    source: "remote" as const,
    model: "memory-custom/my-model",
    dimensions: null,
    identity: "https://endpoint.internal|my-model",
    signature: "remote:https://endpoint.internal|my-model:null",
    reason: "custom remote provider configured (dim=unknown, will probe at embed time)",
  };
}

test("withMeasuredDimensions fills null dimensions and rebuilds signature", () => {
  const r = customResolution();
  const out = withMeasuredDimensions(r, 3072);
  assert.equal(out.dimensions, 3072);
  assert.equal(out.signature, "remote:https://endpoint.internal|my-model:3072");
  assert.match(out.reason, /dim=3072 measured/);
});

test("withMeasuredDimensions is a no-op when dimensions already known or invalid", () => {
  const known = { ...customResolution(), dimensions: 768, signature: "remote:m:768" };
  assert.equal(withMeasuredDimensions(known, 3072), known);
  const unknown = customResolution();
  assert.equal(withMeasuredDimensions(unknown, 0), unknown);
  assert.equal(withMeasuredDimensions(unknown, 12.5), unknown);
  const sourceless = { ...customResolution(), source: null };
  assert.equal(withMeasuredDimensions(sourceless, 100), sourceless);
});

// ── preserveExistingCodexConnectionState ─────────────────────────────────────

function basePayload(): CodexImportPayload {
  return {
    provider: "codex",
    authType: "oauth",
    accessToken: "at",
    refreshToken: "rt",
    email: "user@example.com",
    expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    tokenExpiresAt: new Date(Date.now() + 86400_000).toISOString(),
    testStatus: "active",
    isActive: true,
    errorCode: null,
    lastError: null,
    lastErrorAt: null,
    lastErrorType: null,
    lastErrorSource: null,
    backoffLevel: 0,
    rateLimitedUntil: null,
    priority: 3,
    providerSpecificData: { workspaceId: "ws-1", chatgptPlanType: "free" },
  };
}

test("preserveExistingCodexConnectionState merges existing PSD under import and drops priority", () => {
  const existing = [
    {
      provider: "codex",
      authType: "oauth",
      email: "user@example.com",
      providerSpecificData: {
        workspaceId: "ws-1",
        chatgptPlanType: "pro",
        codexFingerprintMode: "pinned",
        codexExhaustedWindowByScope: JSON.stringify({ window_5h: true }),
      },
      priority: 7,
    },
  ];
  const out = preserveExistingCodexConnectionState(basePayload(), existing);
  assert.equal(out.priority, undefined);
  assert.equal(out.providerSpecificData?.workspaceId, "ws-1");
  // Import keys win over stored state...
  assert.equal(out.providerSpecificData?.chatgptPlanType, "free");
  // ...but operator/runtime-only state survives.
  assert.equal((out.providerSpecificData as Record<string, unknown>).codexFingerprintMode, "pinned");
  assert.ok((out.providerSpecificData as Record<string, unknown>).codexExhaustedWindowByScope);
});

test("preserveExistingCodexConnectionState returns payload unchanged on no match", () => {
  const payload = basePayload();
  assert.equal(preserveExistingCodexConnectionState(payload, []), payload);
  const mismatched = [
    { provider: "codex", authType: "oauth", email: "other@example.com", providerSpecificData: { workspaceId: "ws-1" } },
  ];
  assert.equal(preserveExistingCodexConnectionState(payload, mismatched), payload);
});

test("normalizeCodexImportRecord emits tokenExpiresAt mirroring expiresAt", () => {
  const res = normalizeCodexImportRecord({
    access_token: "a.b.c",
    refresh_token: "rt",
    email: "user@example.com",
  });
  assert.ok(res.ok);
  if (res.ok) {
    assert.equal(res.payload.tokenExpiresAt, res.payload.expiresAt);
  }
});
