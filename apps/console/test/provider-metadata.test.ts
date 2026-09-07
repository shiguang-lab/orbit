import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

test("catalog failure shows the source error while preserving saved connections", async () => {
  const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, ssr: { noExternal: ["@lobehub/icons"] } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, staleTime: Infinity } } });
  try {
    const { default: ProvidersPage } = await vite.ssrLoadModule("/src/features/providers/providers.tsx");
    client.setQueryData(["providers"], { connections: [{ id: "saved-connection", provider: "registered-provider", name: "Saved production connection", isActive: true }] });
    client.getQueryCache().build(client, { queryKey: ["providers", "catalog"] }).setState({ status: "error", fetchStatus: "idle", error: new Error("Catalog unavailable (503)") });
    client.setQueryData(["provider-nodes"], { nodes: [] });
    client.setQueryData(["providers", "expiration"], {});
    client.setQueryData(["settings", "sidebar"], {});
    client.setQueryData(["providers", "openrouter-stats"], {});
    client.setQueryData(["embedded-services", "cliproxy"], null);
    client.setQueryData(["embedded-services", "9router"], null);
    client.setQueryData(["embedded-services", "cliproxy-accounts"], []);
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(ProvidersPage))));
    assert.match(html, /Catalog unavailable \(503\)/);
    assert.match(html, /registered-provider/);
    assert.match(html, /(1 connected|1 个已连接)/);
    assert.match(html, /provider-section-configured/);
    assert.match(html, /(Provider catalog|提供者目录): Catalog unavailable/);
  } finally {
    client.clear();
    await vite.close();
  }
});
