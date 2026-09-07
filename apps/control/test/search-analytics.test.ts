import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const root = await mkdtemp(join(tmpdir(), "search-analytics-"));
process.env.NODE_ENV = "test";
process.env.API_KEY_SECRET = "search-test-api-key-secret-1234567890";
process.env.JWT_SECRET = "search-test-jwt-secret-1234567890";
process.env.DATA_DIR = root;
process.env.SQLITE_FILE = join(root, "storage.sqlite");
process.env.SG_IDENTITY_AUDIENCE = "omniroute-api";
process.env.SG_IDENTITY_ENTITLEMENT = "omniroute:access";
process.env.SG_IDENTITY_JWKS_FILE = join(root, "jwks.json");
const { privateKey, publicKey } = await generateKeyPair("RS256");
await writeFile(process.env.SG_IDENTITY_JWKS_FILE, JSON.stringify({ keys: [{ ...await exportJWK(publicKey), kid: "search-test", alg: "RS256" }] }));
const token = await new SignJWT({ sid: "search-session", entitlements: ["omniroute:access"] })
  .setProtectedHeader({ alg: "RS256", typ: "sg-identity+jwt", kid: "search-test" })
  .setIssuer("https://shiguanglab.com").setAudience("omniroute-api").setSubject("search-user")
  .setIssuedAt().setNotBefore("0s").setExpirationTime("5m").sign(privateKey);
const { getDbInstance } = await import("@orbit/core/db/connection");
const { closeDbInstance } = await import("@orbit/core/db/runtime-lifecycle");
const { createApiKey } = await import("@orbit/core/db/api-keys");
const { SEARCH_PROVIDERS } = await import("@orbit/inference/config/searchRegistry");
const { SearchAnalyticsController } = await import("../src/analytics/search-analytics.controller.js");
const { SearchAnalyticsService } = await import("../src/analytics/search-analytics.service.js");
class SearchTestModule {}
Module({ controllers: [SearchAnalyticsController], providers: [SearchAnalyticsService] })(SearchTestModule);
const app = await NestFactory.create(SearchTestModule, new FastifyAdapter(), { logger: false });
await app.listen(0, "127.0.0.1");
const base = await app.getUrl();
const endpoint = `${base}/api/search/analytics`;
const headers = { "x-sg-identity": token };
const db = getDbInstance();
after(async () => { await app.close(); closeDbInstance(); await rm(root, { recursive: true, force: true }); });

test("search management endpoint accepts SSO and management keys, rejects anonymous and inference credentials", async () => {
  assert.equal((await fetch(endpoint)).status, 401);
  assert.equal((await fetch(endpoint, { headers: { "x-sg-identity": "forged" } })).status, 401);
  const readKey = await createApiKey("search-read", "search-test", ["read"]);
  assert.equal((await fetch(endpoint, { headers: { authorization: `Bearer ${readKey.key}` } })).status, 403);
  const manageKey = await createApiKey("search-manage", "search-test", ["manage"]);
  assert.equal((await fetch(endpoint, { headers: { authorization: `Bearer ${manageKey.key}` } })).status, 200);
  const response = await fetch(endpoint, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const empty = await response.json();
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.byProvider, {});
  assert.equal((await fetch(`${base}/api/v1/search/analytics`, { headers })).status, 404);
});

test("frontend client, HTTP SSO route, SQLite aggregates and page agree for populated and empty data", async () => {
  const insert = db.prepare("INSERT INTO call_logs (id, timestamp, request_type, provider, status, duration) VALUES (?, ?, ?, ?, ?, ?)");
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  insert.run("search-1", today, "search", "brave-search", 200, 2);
  insert.run("search-2", today, "search", "brave-search", 500, 100);
  insert.run("search-3", yesterday, "search", "tavily-search", 200, 198);
  insert.run("chat-ignored", today, "chat", "openai", 200, 9999);

  // Load the actual console client/page; only the local test gateway supplies its signed identity.
  const consoleRequire = createRequire(new URL("../../console/package.json", import.meta.url));
  const { createServer } = await import(consoleRequire.resolve("vite"));
  const { createElement } = consoleRequire("react");
  const { renderToStaticMarkup } = consoleRequire("react-dom/server");
  const vite = await createServer({ root: new URL("../../console", import.meta.url).pathname, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  const { QueryClient, QueryClientProvider } = await vite.ssrLoadModule("@tanstack/react-query");
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    const { searchAnalyticsApi } = await vite.ssrLoadModule("/src/entities/api.ts");
    const { default: SearchAnalyticsPage } = await vite.ssrLoadModule("/src/features/analytics/search-analytics.tsx");
    Object.assign(globalThis, { window: { location: { origin: base } } });
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), "/api/search/analytics");
      return originalFetch(`${base}${url}`, { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), ...headers } });
    };
    const stats = await searchAnalyticsApi.getData();
    assert.equal(stats.total, 3);
    assert.equal(stats.today, 2);
    assert.equal(stats.errors, 1);
    assert.equal(stats.cached, 1);
    assert.equal(stats.cacheHitRate, 33);
    assert.equal(stats.avgDurationMs, 100);
    assert.deepEqual(stats.byProvider, {
      "brave-search": { count: 2, costUsd: SEARCH_PROVIDERS["brave-search"].costPerQuery * 2 },
      "tavily-search": { count: 1, costUsd: SEARCH_PROVIDERS["tavily-search"].costPerQuery },
    });
    assert.equal(stats.totalCostUsd, SEARCH_PROVIDERS["brave-search"].costPerQuery * 2 + SEARCH_PROVIDERS["tavily-search"].costPerQuery);
    client.setQueryData(["search-analytics-data"], stats);
    const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(SearchAnalyticsPage)));
    const html = render();
    assert.match(html, /brave/);
    assert.match(html, /tavily/);
    assert.ok(html.includes(stats.totalCostUsd.toFixed(4)));
    assert.doesNotMatch(html, /Cannot GET/);
    db.prepare("DELETE FROM call_logs WHERE request_type = 'search'").run();
    const empty = await searchAnalyticsApi.getData();
    assert.equal(empty.total, 0);
    client.setQueryData(["search-analytics-data"], empty);
    assert.match(render(), /尚无搜索请求/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    client.clear();
    await vite.close();
  }
});
