import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { parseRadarAdminUrl, radarAdminUrlSchema } from "@orbit/contracts/radar-admin-url";
import {
  getContributorClaimUrl,
  getRadarAdminUrl,
  getSupporterPlansUrl,
} from "../src/radar/radar-links.js";

const originalEnv = {
  contributor: process.env.RADAR_CONTRIBUTOR_CLAIM_URL,
  plans: process.env.RADAR_SUPPORTER_PLANS_URL,
  admin: process.env.RADAR_ADMIN_URL,
};

afterEach(() => {
  if (originalEnv.contributor === undefined) delete process.env.RADAR_CONTRIBUTOR_CLAIM_URL;
  else process.env.RADAR_CONTRIBUTOR_CLAIM_URL = originalEnv.contributor;
  if (originalEnv.plans === undefined) delete process.env.RADAR_SUPPORTER_PLANS_URL;
  else process.env.RADAR_SUPPORTER_PLANS_URL = originalEnv.plans;
  if (originalEnv.admin === undefined) delete process.env.RADAR_ADMIN_URL;
  else process.env.RADAR_ADMIN_URL = originalEnv.admin;
});

test("preserves public Radar link defaults and raw environment overrides", () => {
  delete process.env.RADAR_CONTRIBUTOR_CLAIM_URL;
  delete process.env.RADAR_SUPPORTER_PLANS_URL;
  assert.equal(getContributorClaimUrl(), "https://radar.orbit.online/auth/github");
  assert.equal(getSupporterPlansUrl(), "https://radar.orbit.online/planos");

  process.env.RADAR_CONTRIBUTOR_CLAIM_URL = "https://example.test/claim";
  process.env.RADAR_SUPPORTER_PLANS_URL = "https://example.test/plans";
  assert.equal(getContributorClaimUrl(), "https://example.test/claim");
  assert.equal(getSupporterPlansUrl(), "https://example.test/plans");
});

test("accepts HTTPS and HTTP loopback admin URLs while normalizing them", () => {
  assert.equal(parseRadarAdminUrl(" https://admin.example.test/path "), "https://admin.example.test/path");
  assert.equal(parseRadarAdminUrl("http://localhost:8080/admin"), "http://localhost:8080/admin");
  assert.equal(parseRadarAdminUrl("http://127.255.0.1/admin"), "http://127.255.0.1/admin");
  assert.equal(parseRadarAdminUrl("http://[::1]:8080/admin"), "http://[::1]:8080/admin");
});

test("rejects unsafe, credentialed, malformed, and oversized admin URLs", () => {
  for (const value of [
    "http://admin.example.test",
    "https://user:password@admin.example.test",
    "http://128.0.0.1",
    "not a url",
    "",
    `https://example.test/${"x".repeat(2048)}`,
  ]) {
    assert.equal(radarAdminUrlSchema.safeParse(value).success, false, value.slice(0, 80));
    assert.equal(parseRadarAdminUrl(value), null);
  }
});

test("reads and validates the owner admin URL from process.env", () => {
  process.env.RADAR_ADMIN_URL = "https://admin.example.test";
  assert.equal(getRadarAdminUrl(), "https://admin.example.test/");
  process.env.RADAR_ADMIN_URL = "http://admin.example.test";
  assert.equal(getRadarAdminUrl(), null);
  delete process.env.RADAR_ADMIN_URL;
  assert.equal(getRadarAdminUrl(), null);
});
