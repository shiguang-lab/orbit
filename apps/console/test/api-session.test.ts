import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

test("API 401 checks SSO, preserves business errors, and redirects only when the session expires", async () => {
  const vite = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    define: { "import.meta.env.VITE_DEV_BYPASS_AUTH": '"0"' },
  });
  const originalFetch = globalThis.fetch;
  const redirects: string[] = [];
  const storage = new Map<string, string>();
  const location = new URL("https://gateway.example/dashboard/cloud-agents");
  Object.assign(globalThis, {
    window: { location: { href: location.href, origin: location.origin, pathname: location.pathname, replace: (url: string) => redirects.push(url) } },
    sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
  });
  try {
    const { api, cloudAgentsApi, ApiError } = await vite.ssrLoadModule("/src/entities/api.ts");
    let checks = 0;
    globalThis.fetch = async (url) => {
      if (String(url) === "/api/auth/session") {
        checks++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return Response.json({ authenticated: true, subject: "sso-user" });
      }
      assert.equal(String(url), "/api/cloud-agents/tasks?limit=100");
      return Response.json({ error: "Upstream task credentials rejected" }, { status: 401 });
    };
    const results = await Promise.allSettled([cloudAgentsApi.list(), cloudAgentsApi.list()]);
    for (const result of results) {
      assert.equal(result.status, "rejected");
      if (result.status === "rejected") {
        assert.ok(result.reason instanceof ApiError);
        assert.equal(result.reason.message, "Upstream task credentials rejected");
        assert.equal(result.reason.status, 401);
      }
    }
    assert.equal(checks, 1);
    assert.deepEqual(redirects, []);

    for (const status of [403, 503]) {
      globalThis.fetch = async (url) => Response.json({}, { status: String(url) === "/api/auth/session" ? status : 401 });
      await assert.rejects(() => api("/cloud-agents/tasks"));
      assert.deepEqual(redirects, []);
    }
    globalThis.fetch = async (url) => {
      if (String(url) === "/api/auth/session") throw new Error("SSO unavailable");
      return Response.json({}, { status: 401 });
    };
    await assert.rejects(() => api("/cloud-agents/tasks"));
    assert.deepEqual(redirects, []);

    globalThis.fetch = async () => Response.json({ error: "session_missing" }, { status: 401 });
    await assert.rejects(() => api("/cloud-agents/tasks"));
    assert.equal(redirects.length, 1);
    assert.equal(new URL(redirects[0]).searchParams.get("return_to"), location.href);
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});
