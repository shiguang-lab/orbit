import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cloudflareDeploySchema,
  denoDeploySchema,
  freeProxyBulkAddSchema,
  freeProxyListSchema,
  freeProxySourceSchema,
  freeProxySyncSchema,
  vercelDeploySchema,
} from "../src/settings/free-proxy-schemas.js";

test("preserves free proxy source and list query transformations", () => {
  assert.equal(freeProxySourceSchema.parse("webshare"), "webshare");
  assert.equal(freeProxySourceSchema.safeParse("unknown").success, false);
  assert.deepEqual(freeProxyListSchema.parse({
    sources: "1proxy,,proxifly",
    country: "us",
    minQuality: "80",
    search: "  relay  ",
    limit: "25",
    offset: "0",
    onlyNotInPool: "true",
  }), {
    sources: ["1proxy", "proxifly"],
    country: "US",
    minQuality: 80,
    search: "relay",
    limit: 25,
    offset: 0,
    onlyNotInPool: true,
  });
  assert.deepEqual(freeProxyListSchema.parse({}), { onlyNotInPool: false });
});

test("preserves free proxy list limits, sync sources, and bulk UUID bounds", () => {
  assert.equal(freeProxyListSchema.safeParse({ country: "USA" }).success, false);
  assert.equal(freeProxyListSchema.safeParse({ minQuality: 101 }).success, false);
  assert.equal(freeProxyListSchema.safeParse({ limit: 0 }).success, false);
  assert.deepEqual(freeProxySyncSchema.parse({ sources: ["iplocate"] }), { sources: ["iplocate"] });
  assert.equal(freeProxySyncSchema.safeParse({ sources: ["invalid"] }).success, false);
  assert.deepEqual(freeProxyBulkAddSchema.parse({ ids: ["123e4567-e89b-42d3-a456-426614174000"] }), {
    ids: ["123e4567-e89b-42d3-a456-426614174000"],
  });
  assert.equal(freeProxyBulkAddSchema.safeParse({ ids: [] }).success, false);
});

test("preserves deploy defaults and credential validation", () => {
  assert.equal(denoDeploySchema.parse({
    denoToken: "ddo_abcdefghijklmnop",
    orgDomain: "gateway.deno.net",
  }).projectName, "shiguangGateway-deno-relay");
  assert.equal(vercelDeploySchema.parse({
    token: "abcdefghijklmnopqrstuvwxyz",
  }).projectName, "shiguangGateway-relay");
  assert.equal(cloudflareDeploySchema.parse({
    accountId: "abcdef0123456789",
    apiToken: "abcdefghijklmnopqrstuvwxyz",
  }).projectName, "shiguangGateway-relay");

  assert.equal(denoDeploySchema.safeParse({ denoToken: "sk-invalid!", orgDomain: "bad host" }).success, false);
  assert.equal(vercelDeploySchema.safeParse({ token: "short" }).success, false);
  assert.equal(cloudflareDeploySchema.safeParse({
    accountId: "ABCDEF12",
    apiToken: "abcdefghijklmnopqrstuvwxyz",
  }).success, false);
});
