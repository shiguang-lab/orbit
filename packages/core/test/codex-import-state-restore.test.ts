import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCodexImportRecord,
  flattenCodexImportPayload,
} from "../src/lib/oauth/services/codexImport.ts";

const BASE_RECORD = {
  type: "codex",
  access_token: "at",
  refresh_token: "rt",
  id_token: undefined,
  email: "user@example.com",
  account_id: "acct-123",
};

test("normalizeCodexImportRecord mirrors chatgptAccountId into workspaceId for upsert", () => {
  const result = normalizeCodexImportRecord({ ...BASE_RECORD });
  assert.ok(result.ok);
  assert.equal(result.ok && result.payload.providerSpecificData?.chatgptAccountId, "acct-123");
  assert.equal(result.ok && result.payload.providerSpecificData?.workspaceId, "acct-123");
});

test("normalizeCodexImportRecord resets error state on fresh import", () => {
  const result = normalizeCodexImportRecord({ ...BASE_RECORD });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.payload.isActive, true);
  assert.equal(result.payload.errorCode, null);
  assert.equal(result.payload.lastError, null);
  assert.equal(result.payload.lastErrorAt, null);
  assert.equal(result.payload.lastErrorType, null);
  assert.equal(result.payload.lastErrorSource, null);
  assert.equal(result.payload.backoffLevel, 0);
  assert.equal(result.payload.rateLimitedUntil, null);
  assert.equal("priority" in result.payload, false);
});

test("normalizeCodexImportRecord keeps a positive integer priority", () => {
  const result = normalizeCodexImportRecord({ ...BASE_RECORD, priority: 3 });
  assert.ok(result.ok);
  assert.equal(result.ok && result.payload.priority, 3);

  const invalid = normalizeCodexImportRecord({ ...BASE_RECORD, priority: 0 });
  assert.ok(invalid.ok);
  assert.equal(invalid.ok && "priority" in invalid.payload, false);

  const fractional = normalizeCodexImportRecord({ ...BASE_RECORD, priority: 1.5 });
  assert.ok(fractional.ok);
  assert.equal(fractional.ok && "priority" in fractional.payload, false);
});

test("flattenCodexImportPayload accepts single record and arrays", () => {
  assert.deepEqual(flattenCodexImportPayload({ a: 1 }), { ok: true, records: [{ a: 1 }] });
  assert.deepEqual(flattenCodexImportPayload([1, 2]), { ok: true, records: [1, 2] });
  assert.equal(flattenCodexImportPayload("nope").ok, false);
});
