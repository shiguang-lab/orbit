import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("proxy invalidation re-resolves a binding changed by another process", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "orbit-proxy-cache-"));
  process.env.DATA_DIR = dataDir;
  process.env.NODE_ENV = "production";
  const { getDbInstance, closeDbInstance } = await import("../../../packages/core/src/lib/db/core.ts");
  try {
    const { createProxy, assignProxyToScope } = await import("@orbit/core/db/proxy-registry");
    const { resolveProxyForConnection } = await import("@orbit/core/db/settings");
    const { RuntimeControlService } = await import("../src/runtime-control/runtime-control.service.js");
    const silicon = await createProxy({ name: "Silicon", type: "socks5", host: "127.0.0.1", port: 17891 });
    const seoul = await createProxy({ name: "Seoul", type: "socks5", host: "127.0.0.1", port: 17890 });
    await assignProxyToScope("account", "cache-test", silicon!.id);
    assert.equal(((await resolveProxyForConnection("cache-test")).proxy as { port: number })?.port, 17891);
    // A separate control process persists the change without bumping gateway memory.
    getDbInstance().prepare("UPDATE proxy_assignments SET proxy_id = ? WHERE scope = 'account' AND scope_id = ?").run(seoul!.id, "cache-test");
    assert.equal(((await resolveProxyForConnection("cache-test")).proxy as { port: number })?.port, 17891);
    const runtime = new RuntimeControlService(null!);
    await runtime.execute({ version: 1, command: "runtime-cache.invalidate", target: "proxy-dispatcher" });
    assert.equal(((await resolveProxyForConnection("cache-test")).proxy as { port: number })?.port, 17890);
  } finally {
    closeDbInstance();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
