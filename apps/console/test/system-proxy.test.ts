import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

test("system proxy uses the nested API contract for empty, configured, and disabled states", async () => {
  const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  const originalFetch = globalThis.fetch;
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  const { default: SystemProxyPage } = await vite.ssrLoadModule("/src/features/system/proxy.tsx");
  Object.assign(globalThis, { window: { location: { origin: "https://gateway.example" } } });
  const proxy = { type: "socks5", host: "proxy.example", port: 1080, username: "proxy-user", password: "test-password" };
  const initial = { global: null, providers: { openai: proxy }, combos: {}, keys: {} };
  let config: { global: typeof proxy | null; providers: typeof initial.providers; combos: {}; keys: {} } = initial;
  try {
    const { systemProxyApi } = await vite.ssrLoadModule("/src/entities/api.ts");
    globalThis.fetch = async (url, init) => {
      if (String(url) === "/api/auth/csrf") return Response.json({ token: "test-csrf" });
      assert.equal(String(url), "/api/settings/proxy");
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body));
        assert.deepEqual(Object.keys(body), ["global"]);
        assert.equal(new Headers(init.headers).get("x-orbit-csrf"), "test-csrf");
        config = { ...config, global: body.global };
      }
      return Response.json(config);
    };
    assert.deepEqual(await systemProxyApi.getConfig(), initial);
    const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(SystemProxyPage)));
    client.setQueryData(["system-proxy-config"], initial);
    assert.match(render(), /(?:No global proxy configured|全局代理未配置)/);
    assert.doesNotMatch(render(), /NO_PROXY/);
    const configured = await systemProxyApi.updateConfig(proxy);
    assert.deepEqual(configured.global, proxy);
    assert.deepEqual(configured.providers, initial.providers);
    client.setQueryData(["system-proxy-config"], configured);
    assert.match(render(), /(?:Global proxy configured|全局代理已配置)/);
    assert.deepEqual((await systemProxyApi.updateConfig(null)).global, null);
    assert.deepEqual(config.providers, initial.providers);
  } finally {
    globalThis.fetch = originalFetch;
    client.clear();
    await vite.close();
  }
});
