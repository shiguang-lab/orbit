import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT } from "jose";

import {
  getCookieValueFromHeader,
  isDashboardSessionAuthenticated,
} from "../src/dashboard-session.js";

const secret = "dashboard-session-test-secret";

async function token(signingSecret = secret): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(signingSecret));
}

test("dashboard session verifies auth_token from Web Headers", async () => {
  const authToken = await token();
  const request = { headers: new Headers({ cookie: `other=x; auth_token=${authToken}; tail=y` }) };
  assert.equal(await isDashboardSessionAuthenticated(request, secret), true);
});

test("dashboard session verifies framework cookie accessors", async () => {
  const authToken = await token();
  const request = { cookies: { get: (name: string) => name === "auth_token" ? { value: authToken } : undefined } };
  assert.equal(await isDashboardSessionAuthenticated(request, secret), true);
});

test("dashboard session supports Node header records", async () => {
  const authToken = await token();
  assert.equal(getCookieValueFromHeader({ cookie: [`auth_token=${authToken}`] }, "auth_token"), authToken);
  assert.equal(
    await isDashboardSessionAuthenticated({ headers: { cookie: `auth_token=${authToken}` } }, secret),
    true,
  );
});

test("dashboard session rejects missing secrets, missing cookies, and invalid signatures", async () => {
  const invalid = await token("different-secret");
  assert.equal(await isDashboardSessionAuthenticated({ headers: new Headers() }, secret), false);
  assert.equal(
    await isDashboardSessionAuthenticated({ headers: new Headers({ cookie: `auth_token=${invalid}` }) }, secret),
    false,
  );
  assert.equal(
    await isDashboardSessionAuthenticated({ headers: new Headers({ cookie: `auth_token=${invalid}` }) }, undefined),
    false,
  );
});
