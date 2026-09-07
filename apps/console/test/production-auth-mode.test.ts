import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

test("dashboard has one SSO login chain without a build-time local mode", () => {
  for (const path of ["../../../Dockerfile", "../../../docker-compose.yml", "../../../turbo.json", "../src/auth/session.ts"]) {
    assert.doesNotMatch(readFileSync(new URL(path, import.meta.url), "utf8"), /VITE_AUTH_MODE|ORBIT_AUTH_MODE/);
  }
  assert.equal(existsSync(new URL("../src/features/auth/login.tsx", import.meta.url)), false);
});
