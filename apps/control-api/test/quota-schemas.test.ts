import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuditLogQuerySchema,
  GroupCreateSchema,
  PlanUpsertSchema,
  PoolCreateSchema,
  PoolUpdateSchema,
  QuotaPreviewQuerySchema,
  QuotaStoreSettingsSchema,
} from "../src/quota/schemas.js";

test("validates group names and pool primary-connection membership", () => {
  assert.equal(GroupCreateSchema.safeParse({ name: "" }).success, false);
  assert.deepEqual(PoolCreateSchema.parse({ connectionId: "primary", name: "pool" }), {
    connectionId: "primary",
    name: "pool",
    allocations: [],
  });
  assert.equal(PoolCreateSchema.safeParse({
    connectionId: "primary",
    connectionIds: ["secondary"],
    name: "pool",
  }).success, false);
});

test("reuses shared quota dimension and allocation constraints", () => {
  assert.deepEqual(PlanUpsertSchema.parse({
    dimensions: [{ unit: "tokens", window: "daily", limit: 100 }],
  }), {
    dimensions: [{ unit: "tokens", window: "daily", limit: 100 }],
  });
  assert.equal(PlanUpsertSchema.safeParse({
    dimensions: [{ unit: "tokens", window: "daily", limit: 0 }],
  }).success, false);
  assert.equal(PoolUpdateSchema.safeParse({
    allocations: [{ apiKeyId: "key", weight: 101, policy: "hard" }],
  }).success, false);
});

test("preserves store URL validation and preview coercion", () => {
  assert.equal(QuotaStoreSettingsSchema.safeParse({ driver: "redis", redisUrl: "not-a-url" }).success, false);
  assert.deepEqual(QuotaStoreSettingsSchema.parse({ driver: "sqlite", redisUrl: null }), {
    driver: "sqlite",
    redisUrl: null,
  });
  assert.deepEqual(QuotaPreviewQuerySchema.parse({
    apiKeyId: "key",
    poolId: "pool",
    estimatedTokens: "12",
    estimatedUsd: "1.5",
    estimatedRequests: "3",
  }), {
    apiKeyId: "key",
    poolId: "pool",
    estimatedTokens: 12,
    estimatedUsd: 1.5,
    estimatedRequests: 3,
  });
});

test("preserves audit query defaults and limits", () => {
  assert.deepEqual(AuditLogQuerySchema.parse({}), {
    level: "all",
    limit: 50,
    offset: 0,
  });
  assert.equal(AuditLogQuerySchema.safeParse({ limit: 501 }).success, false);
  assert.equal(AuditLogQuerySchema.safeParse({ from: "not-a-date" }).success, false);
});
