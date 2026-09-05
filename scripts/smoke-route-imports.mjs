#!/usr/bin/env node

/** Import every local API and root route module to catch missing dependencies. */
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const appRoot = new URL("../packages/gateway-runtime/src/app/", import.meta.url);
const appRootPath = appRoot.pathname.replace(/\/$/, "");
const apiRootPath = join(appRootPath, "api");
const dataDir = await mkdtemp(join(tmpdir(), "shiguangGateway-route-import-"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "route-import-jwt-secret-1234567890";
process.env.API_KEY_SECRET ??= "route-import-api-secret-1234567890";
process.env.DATA_DIR ??= dataDir;
process.env.SQLITE_FILE ??= join(dataDir, "storage.sqlite");
process.env.SHIGUANG_GATEWAY_DISABLE_BACKGROUND_SERVICES = "1";

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (entry.name === "route.ts") out.push(file);
  }
  return out;
}

const files = await walk(appRootPath);
const failures = [];
for (const file of files) {
  try {
    await import(pathToFileURL(file).href);
  } catch (error) {
    failures.push({ path: relative(appRootPath, file), error: error instanceof Error ? error.message : String(error) });
  }
}
await rm(dataDir, { recursive: true, force: true });
console.log(JSON.stringify({ routeFiles: files.length, importedRouteFiles: files.length, apiRouteFiles: files.filter((file) => file.startsWith(`${apiRootPath}/`)).length, rootRouteFiles: files.filter((file) => !file.startsWith(`${apiRootPath}/`)).length, failures, status: failures.length ? "FAIL" : "PASS" }, null, 2));
if (failures.length) process.exitCode = 1;
