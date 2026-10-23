import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const proxyLoggerPath = path.join(packageRoot, "src/lib/proxyLogger.ts");

function runIsolated(source: string, dataDir: string): void {
  execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", source],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        DATA_DIR: dataDir,
        NODE_ENV: "production",
      },
      stdio: "pipe",
    },
  );
}

test("importing the proxy logger does not open its database", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-log-import-"));
  const databasePath = path.join(dataDir, "storage.sqlite");
  try {
    runIsolated(`await import(${JSON.stringify(pathToFileURL(proxyLoggerPath).href)});`, dataDir);
    assert.equal(fs.existsSync(databasePath), false);

    runIsolated(
      `const runtime = await import(${JSON.stringify(pathToFileURL(proxyLoggerPath).href)});` +
        "runtime.initializeProxyLogStorage(); runtime.closeProxyLogStorage();",
      dataDir,
    );
    assert.equal(fs.existsSync(databasePath), true);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test("edge exclusively owns proxy-log startup and shutdown ordering", () => {
  const edgeBootstrap = fs.readFileSync(
    path.join(repoRoot, "apps/gateway/src/bootstrap.ts"),
    "utf8",
  );
  assert.ok(
    edgeBootstrap.indexOf("services/dbRuntimeHooks") <
      edgeBootstrap.indexOf("initializeProxyLogStorage()"),
    "gateway must register runtime ports before hydrating proxy logs",
  );
  assert.ok(
    edgeBootstrap.indexOf("initializeProxyLogStorage()") <
      edgeBootstrap.indexOf('await import("./app.module.js")'),
    "gateway must hydrate proxy logs before loading handlers",
  );

  const edgeShutdown = fs.readFileSync(
    path.join(repoRoot, "apps/gateway/src/database-runtime-lifecycle.service.ts"),
    "utf8",
  );
  assert.ok(
    edgeShutdown.indexOf("closeProxyLogStorage()") < edgeShutdown.indexOf("closeDbInstance()"),
    "gateway must flush proxy logs before closing SQLite",
  );

  for (const file of ["bootstrap.ts", "database-runtime-lifecycle.service.ts"]) {
    const controlSource = fs.readFileSync(path.join(repoRoot, "apps/control/src", file), "utf8");
    assert.doesNotMatch(controlSource, /(?:initialize|close)ProxyLogStorage/);
  }
});

test("proxy names survive storage hydration and remain searchable", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-log-name-"));
  const loggerUrl = JSON.stringify(pathToFileURL(proxyLoggerPath).href);
  try {
    runIsolated(`
      const logger = await import(${loggerUrl});
      logger.initializeProxyLogStorage();
      logger.logProxyEvent({ proxy: { name: "硅谷-VLESS", type: "socks5", host: "192.168.32.1", port: 17891 } });
      logger.closeProxyLogStorage();
    `, dataDir);
    runIsolated(`
      const assert = (await import("node:assert/strict")).default;
      const logger = await import(${loggerUrl});
      logger.initializeProxyLogStorage();
      assert.equal(logger.getProxyLogs()[0].proxy.name, "硅谷-VLESS");
      assert.equal(logger.getProxyLogs({ search: "硅谷" }).length, 1);
      logger.closeProxyLogStorage();
    `, dataDir);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test("name migration matches historical endpoints without guessing ambiguous names", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-log-name-migration-"));
  const migration = fs.readFileSync(path.join(packageRoot, "src/lib/db/migrations/178_proxy_logs_name.sql"), "utf8");
  try {
    runIsolated(`
      const assert = (await import("node:assert/strict")).default;
      const { getDbInstance } = await import(${JSON.stringify(pathToFileURL(path.join(packageRoot, "src/lib/db/core.ts")).href)});
      const db = getDbInstance();
      const insertProxy = db.prepare("INSERT INTO proxy_registry (id, name, type, host, port) VALUES (?, ?, ?, ?, ?)");
      insertProxy.run("seoul", "首尔-VLESS", "socks5", "192.168.32.1", 17890);
      insertProxy.run("silicon", "硅谷-VLESS", "socks5", "192.168.32.1", 17891);
      insertProxy.run("shared-1", "Shared A", "socks5", "192.168.32.1", 17892);
      insertProxy.run("shared-2", "Shared B", "socks5", "192.168.32.1", 17892);
      const insertLog = db.prepare("INSERT INTO proxy_logs (id, timestamp, proxy_type, proxy_host, proxy_port) VALUES (?, datetime('now'), ?, ?, ?)");
      for (const port of [17890, 17891, 17892, 17893]) insertLog.run(String(port), "socks5", "192.168.32.1", port);
      insertLog.run("different-protocol", "http", "192.168.32.1", 17890);
      insertLog.run("direct", null, null, null);
      db.exec("ALTER TABLE proxy_logs DROP COLUMN proxy_name");
      db.exec(${JSON.stringify(migration)});
      const names = Object.fromEntries(db.prepare("SELECT id, proxy_name FROM proxy_logs").all().map(r => [r.id, r.proxy_name]));
      assert.deepEqual(names, { "17890": "首尔-VLESS", "17891": "硅谷-VLESS", "17892": null, "17893": null, "different-protocol": null, "direct": null });
      db.prepare("UPDATE proxy_registry SET name = 'Renamed' WHERE id = 'silicon'").run();
      const logger = await import(${JSON.stringify(pathToFileURL(proxyLoggerPath).href)});
      logger.initializeProxyLogStorage();
      assert.equal(logger.getProxyLogs().find(r => r.id === "17891").proxy.name, "硅谷-VLESS");
      assert.equal(logger.getProxyLogs().find(r => r.id === "direct").proxy, null);
      logger.closeProxyLogStorage();
    `, dataDir);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
