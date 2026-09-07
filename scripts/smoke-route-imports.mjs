#!/usr/bin/env node

/** Import the deployable Nest route graph to catch missing runtime dependencies. */
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const appNames = ["control", "gateway"];

export async function discoverRouteModules(root = repoRoot) {
  async function walk(dir, out = []) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) await walk(file, out);
      else if (/\.(?:controller|handler|module)\.ts$/.test(entry.name)) out.push(file);
    }
    return out.sort();
  }
  const apps = {};
  for (const name of appNames) {
    const files = await walk(join(root, "apps", name, "src"));
    if (!files.length) throw new Error(`No Nest route modules discovered for ${name}`);
    apps[name] = files;
  }
  return apps;
}

async function main() {
  const dataDir = await mkdtemp(join(tmpdir(), "shiguangGateway-route-import-"));
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "route-import-jwt-secret-1234567890";
  process.env.API_KEY_SECRET = "route-import-api-secret-1234567890";
  // Always isolate imports, even if the invoking shell has production paths.
  process.env.DATA_DIR = dataDir;
  process.env.SQLITE_FILE = join(dataDir, "storage.sqlite");
  process.env.SHIGUANG_GATEWAY_DISABLE_BACKGROUND_SERVICES = "1";
  const failures = [];
  try {
    const apps = await discoverRouteModules();
    const files = Object.values(apps).flat();
    for (const file of files) {
      try {
        await import(pathToFileURL(file).href);
      } catch (error) {
        failures.push({ path: relative(repoRoot, file), error: error instanceof Error ? error.message : String(error) });
      }
    }
    console.log(JSON.stringify({
      routeModules: files.length,
      importedRouteModules: files.length - failures.length,
      apps: Object.fromEntries(Object.entries(apps).map(([name, entries]) => [name, entries.length])),
      failures, status: failures.length ? "FAIL" : "PASS",
    }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
