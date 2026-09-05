#!/usr/bin/env node

/**
 * Structural contract for the monorepo. This is intentionally independent of
 * the route parity checks: it verifies that deployables have one Nest entry
 * point and that shared packages expose package metadata rather than hidden
 * runtime directories.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const failures = [];
const rel = (file) => relative(root, file).split(sep).join("/");
const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
};
const fail = (rule, file, detail) => failures.push({ rule, file: rel(file), ...(detail ? { detail } : {}) });

const appKinds = {
  admin: { entry: "main.tsx", nest: false },
  "control-api": { entry: "main.ts", nest: true },
  "edge-gateway": { entry: "main.ts", nest: true },
  realtime: { entry: "main.ts", nest: true },
  worker: { entry: "main.ts", nest: false },
  importer: { entry: "main.ts", nest: false },
};

for (const [name, shape] of Object.entries(appKinds)) {
  const dir = join(root, "apps", name);
  const manifestPath = join(dir, "package.json");
  const manifest = readJson(manifestPath);
  if (!manifest) { fail("app-package-json", manifestPath); continue; }
  const src = join(dir, "src");
  if (!existsSync(join(src, shape.entry))) fail("app-entrypoint", join(src, shape.entry));
  if (shape.nest) {
    for (const file of ["app.module.ts", "bootstrap.ts"]) {
      if (!existsSync(join(src, file))) fail("nest-app-layout", join(src, file));
    }
    if (!manifest.scripts?.build || !manifest.scripts?.typecheck) {
      fail("nest-app-scripts", manifestPath, "build and typecheck scripts are required");
    }
  }
  for (const scriptName of ["dev", "start"]) {
    const script = manifest.scripts?.[scriptName];
    if (typeof script === "string" && script.includes("packages/core-domain/tsconfig")) {
      fail("app-local-tsconfig", manifestPath, `${scriptName} must use the app's own tsconfig.json`);
    }
  }
  if (!existsSync(join(dir, "tsconfig.json"))) fail("app-tsconfig", join(dir, "tsconfig.json"));
}

const packageDirs = readdirSync(join(root, "packages"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(root, "packages", entry.name));
for (const dir of packageDirs) {
  const manifestPath = join(dir, "package.json");
  const manifest = readJson(manifestPath);
  if (!manifest) { fail("package-package-json", manifestPath); continue; }
  const expectedName = `@shiguang-gateway/${dir.split(sep).pop()}`;
  if (manifest.name !== expectedName) fail("package-name", manifestPath, `${manifest.name} != ${expectedName}`);
  if (!existsSync(join(dir, "tsconfig.json"))) fail("package-tsconfig", join(dir, "tsconfig.json"));
  if (!manifest.exports) fail("package-exports", manifestPath, "shared packages must expose an explicit entry surface");
  if (!manifest.scripts?.typecheck && manifest.name !== "@shiguang-gateway/core-domain") {
    fail("package-typecheck-script", manifestPath);
  }
}

for (const name of ["gateway-runtime", "server-runtime"]) {
  const dir = join(root, "packages", name);
  if (existsSync(dir)) fail("retired-runtime-package", dir);
}
const kernelManifest = readJson(join(root, "packages/http-kernel/package.json"));
if (kernelManifest?.exports && Object.keys(kernelManifest.exports).some((key) => /auth|compat|route/i.test(key))) {
  fail("http-kernel-scope", join(root, "packages/http-kernel/package.json"), "kernel exports only Nest transport modules");
}

const report = {
  status: failures.length ? "FAIL" : "PASS",
  apps: Object.keys(appKinds),
  packages: packageDirs.map((dir) => rel(dir)),
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (strict && failures.length) process.exitCode = 1;
