import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  checkLoginGuard,
  clearLoginAttempts,
  ensureLoginGuardSchema,
  getLoginGuardSizeForTests,
  LoginGuard,
  LOGIN_GUARD_TUNABLES,
  recordLoginFailure,
  resetLoginGuardForTests,
} from "../src/auth/login.guard.js";
import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";

const originalDateNow = Date.now;
const enabled = { enabled: true };

ensureLoginGuardSchema();

afterEach(() => {
  Date.now = originalDateNow;
  resetLoginGuardForTests();
});

test("locks on the fifth failure and preserves retry timing", () => {
  let now = 10_000;
  Date.now = () => now;

  for (let failure = 1; failure < LOGIN_GUARD_TUNABLES.FAILURE_THRESHOLD; failure += 1) {
    assert.deepEqual(recordLoginFailure(" 127.0.0.1 ", enabled), { allowed: true });
  }

  assert.deepEqual(recordLoginFailure("127.0.0.1", enabled), {
    allowed: false,
    retryAfterSeconds: LOGIN_GUARD_TUNABLES.LOCKOUT_MS / 1000,
  });

  now += LOGIN_GUARD_TUNABLES.LOCKOUT_MS - 1;
  assert.deepEqual(checkLoginGuard("127.0.0.1", enabled), {
    allowed: false,
    retryAfterSeconds: 1,
  });

  now += 1;
  assert.deepEqual(checkLoginGuard("127.0.0.1", enabled), { allowed: true });
});

test("uses a strict window boundary and resets only after it has elapsed", () => {
  let now = 100;
  Date.now = () => now;

  for (let failure = 1; failure < LOGIN_GUARD_TUNABLES.FAILURE_THRESHOLD; failure += 1) {
    recordLoginFailure("boundary", enabled);
  }

  now += LOGIN_GUARD_TUNABLES.WINDOW_MS;
  assert.equal(recordLoginFailure("boundary", enabled).allowed, false);

  resetLoginGuardForTests();
  now = 100;
  recordLoginFailure("expired", enabled);
  now += LOGIN_GUARD_TUNABLES.WINDOW_MS + 1;
  assert.deepEqual(recordLoginFailure("expired", enabled), { allowed: true });
});

test("disabled mode is a no-op and clear removes normalized keys", () => {
  Date.now = () => 1;

  assert.deepEqual(recordLoginFailure(null, { enabled: false }), { allowed: true });
  assert.equal(getLoginGuardSizeForTests(), 0);

  recordLoginFailure(undefined, enabled);
  assert.equal(getLoginGuardSizeForTests(), 1);
  clearLoginAttempts("   ");
  assert.equal(getLoginGuardSizeForTests(), 0);
});

test("opportunistically prunes expired entries after the map threshold", () => {
  let now = 0;
  Date.now = () => now;

  for (let index = 0; index <= 256; index += 1) {
    recordLoginFailure(`ip-${index}`, enabled);
  }
  assert.equal(getLoginGuardSizeForTests(), 257);

  now = LOGIN_GUARD_TUNABLES.WINDOW_MS + 1;
  recordLoginFailure("fresh", enabled);
  assert.equal(getLoginGuardSizeForTests(), 1);
  assert.deepEqual(checkLoginGuard("fresh", enabled), { allowed: true });
});

test("separate guard instances share lockout state through the database", () => {
  Date.now = () => 20_000;
  const database = getDbInstance();
  const firstReplica = new LoginGuard(database);
  const secondReplica = new LoginGuard(database);

  for (let failure = 1; failure < LOGIN_GUARD_TUNABLES.FAILURE_THRESHOLD; failure += 1) {
    assert.deepEqual(firstReplica.recordFailure("replicated-client", enabled), { allowed: true });
  }

  assert.deepEqual(secondReplica.recordFailure("replicated-client", enabled), {
    allowed: false,
    retryAfterSeconds: LOGIN_GUARD_TUNABLES.LOCKOUT_MS / 1000,
  });
  assert.equal(firstReplica.check("replicated-client", enabled).allowed, false);
});
