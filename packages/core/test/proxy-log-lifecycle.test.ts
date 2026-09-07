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
    path.join(repoRoot, "apps/edge-gateway/src/bootstrap.ts"),
    "utf8",
  );
  assert.ok(
    edgeBootstrap.indexOf("services/dbRuntimeHooks") <
      edgeBootstrap.indexOf("initializeProxyLogStorage()"),
    "edge-gateway must register runtime ports before hydrating proxy logs",
  );
  assert.ok(
    edgeBootstrap.indexOf("initializeProxyLogStorage()") <
      edgeBootstrap.indexOf('await import("./app.module.js")'),
    "edge-gateway must hydrate proxy logs before loading handlers",
  );

  const edgeShutdown = fs.readFileSync(
    path.join(repoRoot, "apps/edge-gateway/src/database-runtime-lifecycle.service.ts"),
    "utf8",
  );
  assert.ok(
    edgeShutdown.indexOf("closeProxyLogStorage()") < edgeShutdown.indexOf("closeDbInstance()"),
    "edge-gateway must flush proxy logs before closing SQLite",
  );

  for (const file of ["bootstrap.ts", "database-runtime-lifecycle.service.ts"]) {
    const controlSource = fs.readFileSync(path.join(repoRoot, "apps/control-api/src", file), "utf8");
    assert.doesNotMatch(controlSource, /(?:initialize|close)ProxyLogStorage/);
  }
});
