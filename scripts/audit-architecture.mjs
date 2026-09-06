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
const walkFiles = (dir, predicate, out = []) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, predicate, out);
    else if (predicate(path)) out.push(path);
  }
  return out;
};

const appKinds = {
  admin: { entry: "main.tsx", nest: false },
  cli: { entry: "shiguang-gateway.mjs", nest: false },
  "control-api": { entry: "main.ts", nest: true },
  "edge-gateway": { entry: "main.ts", nest: true },
  realtime: { entry: "main.ts", nest: true },
  worker: { entry: "main.ts", nest: true },
  importer: { entry: "main.ts", nest: false },
};

if (existsSync(join(root, "packages/core-domain/bin"))) {
  fail("cli-app-ownership", join(root, "packages/core-domain/bin"), "CLI executable source belongs in apps/cli");
}
for (const legacyUiPath of ["src/shared/components", "src/shared/hooks"]) {
  const path = join(root, "packages/core-domain", legacyUiPath);
  if (existsSync(path)) {
    fail(
      "admin-ui-ownership",
      path,
      "React UI components and hooks belong in apps/admin, not the server-side domain package",
    );
  }
}
const coreDomainDir = join(root, "packages/core-domain");
const coreDomainManifest = readJson(join(coreDomainDir, "package.json"));
if (coreDomainManifest?.dependencies?.next || coreDomainManifest?.dependencies?.["next-intl"]) {
  fail(
    "domain-transport-dependency",
    join(coreDomainDir, "package.json"),
    "core-domain must not depend on the retired Next.js application transport",
  );
}
for (const file of walkFiles(join(coreDomainDir, "src"), (path) => /\.[cm]?[jt]sx?$/.test(path))) {
  if (/from\s+["']next(?:\/[^"']*)?["']/.test(readFileSync(file, "utf8"))) {
    fail("domain-transport-import", file, "transport-neutral domain source must not import Next.js");
  }
}

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

    // Nest applications expose HTTP transport through controllers. A source
    // file named `*.route.ts` is a Next/Fastify route-module convention and
    // bypasses Nest's module graph; keep transport adapters behind services or
    // handlers instead. Also verify that files using Nest's canonical suffixes
    // carry the matching decorator so naming and registration cannot drift.
    const nestSourceFiles = walkFiles(src, (path) => path.endsWith(".ts"));
    for (const file of nestSourceFiles) {
      const source = readFileSync(file, "utf8");
      const basename = file.split(sep).pop() || "";
      if (basename === "route.ts" || basename.endsWith(".route.ts")) {
        fail("nest-route-file-naming", file, "use a Nest controller/service/handler instead of route.ts or *.route.ts");
      }
      if (basename.endsWith(".module.ts") && !/@Module\s*\(/.test(source)) {
        fail("nest-module-decorator", file, "*.module.ts must declare @Module");
      }
      if (basename.endsWith(".controller.ts") && !/@Controller\s*\(/.test(source)) {
        fail("nest-controller-decorator", file, "*.controller.ts must declare @Controller");
      }
      if (basename.endsWith(".service.ts") && !/@Injectable\s*\(/.test(source)) {
        fail("nest-service-decorator", file, "*.service.ts must declare @Injectable");
      }
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

// Package code must consume the data-only CLI capability contract. Reading the
// CLI application's source tree makes behavior depend on cwd and bypasses the
// package boundary entirely.
const cliRegistryParserPath = join(
  root,
  "packages/core-domain/src/lib/agentSkills/cliRegistryParser.ts"
);
if (existsSync(cliRegistryParserPath)) {
  const source = readFileSync(cliRegistryParserPath, "utf8");
  for (const [pattern, detail] of [
    [/from\s+["']node:fs["']/, "must not read the filesystem"],
    [/from\s+["']node:path["']/, "must not derive application paths"],
    [/process\.cwd\s*\(/, "must not depend on the caller cwd"],
    [/bin[\\/]cli[\\/]commands/, "must not inspect CLI application source"],
  ]) {
    if (pattern.test(source)) fail("cli-capability-contract", cliRegistryParserPath, detail);
  }
  if (!source.includes("@shiguang-gateway/contracts/cli-capabilities")) {
    fail("cli-capability-contract", cliRegistryParserPath, "must consume the published manifest contract");
  }
}

const agentSkillsGeneratorPath = join(
  root,
  "packages/core-domain/src/lib/agentSkills/generator.ts"
);
if (existsSync(agentSkillsGeneratorPath)) {
  const source = readFileSync(agentSkillsGeneratorPath, "utf8");
  if (/cliRegistry\s*=\s*\{\s*commands:\s*new Map\(\),\s*families:\s*new Map\(\)/s.test(source)) {
    fail("cli-capability-contract", agentSkillsGeneratorPath, "must not silently replace manifest errors with an empty registry");
  }
}

const report = {
  status: failures.length ? "FAIL" : "PASS",
  apps: Object.keys(appKinds),
  packages: packageDirs.map((dir) => rel(dir)),
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (strict && failures.length) process.exitCode = 1;
