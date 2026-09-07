import assert from "node:assert/strict";
import { test } from "node:test";
import { requireAuthSession, retryUnifiedLogin, unifiedLoginUrl, performLogout } from "../src/auth/session.ts";

const location = new URL("https://gateway.example/dashboard/providers?tab=all#active");
const redirects: string[] = [];
const storage = new Map<string, string>();
Object.assign(globalThis, {
  window: { location: { ...Object.fromEntries(["href", "origin", "hostname", "pathname", "search", "hash"].map(k => [k, location[k as keyof URL]])), replace: (url: string) => redirects.push(url) } },
  sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
});

test("SSO return URL preserves the destination and never targets the product login page", () => {
  assert.equal(new URL(unifiedLoginUrl(location)).origin, "https://shiguanglab.com");
  assert.equal(new URL(unifiedLoginUrl(location)).searchParams.get("return_to"), location.href);
  assert.equal(new URL(unifiedLoginUrl(new URL("https://gateway.example/login"))).searchParams.get("return_to"), "https://gateway.example/dashboard");
});

test("service failures, denied access and malformed responses do not redirect to login", async () => {
  for (const status of [403, 500, 503]) {
    globalThis.fetch = async () => new Response("{}", { status });
    await assert.rejects(requireAuthSession);
  }
  globalThis.fetch = async () => new Response("<html>login</html>");
  await assert.rejects(requireAuthSession);
  globalThis.fetch = async () => { throw new Error("offline"); };
  await assert.rejects(requireAuthSession);
  assert.equal(redirects.length, 0);
});

test("a failed SSO round trip stops instead of automatically redirecting again", async () => {
  storage.set("orbit:sso-redirect", "1");
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  await assert.rejects(requireAuthSession);
  assert.equal(redirects.length, 0);
  globalThis.fetch = async () => Response.json({ authenticated: true, subject: "real-user", roles: [] });
  assert.equal((await requireAuthSession())?.id, "real-user");
  assert.equal(storage.size, 0);
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  assert.equal(await requireAuthSession(), null);
  assert.equal(redirects.length, 1);
});

test("failed SSO logout does not pretend the session was revoked", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 503 });
  await assert.rejects(performLogout);
  assert.equal(redirects.length, 1);
});
