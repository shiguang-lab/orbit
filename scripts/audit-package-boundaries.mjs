#!/usr/bin/env node

/**
 * Enforce the package ownership rule: packages contain capabilities shared by
 * multiple workspace units; app-specific routes and orchestration live below
 * apps/<name>. Legacy mixed packages are reported until decomposed.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const repoRoot = resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const ignored = new Set(["node_modules", "dist", ".turbo", ".git"]);
const sourceExtensions = /\.(?:[cm]?[jt]sx?)$/i;
const importSpecifierPattern = /(?:\bimport|\bexport)\s+(?:[^"'`;]*?\s+from\s*)?["']([^"']+)["']|\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
const violations = [];
const rel = (file) => relative(repoRoot, file).split(sep).join("/");
const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
};
const add = (rule, file, detail) => violations.push({ rule, file: rel(file), detail });

function isAppOwnedSource(file) {
  const path = rel(file);
  const basename = file.split(sep).pop() || "";
  if (basename === "route.ts" || basename.endsWith(".route.ts")) return true;
  if (/\/src\/(app|routes)\//.test(path)) return true;
  // `src/control` is the reviewed package-contract namespace. Only transport
  // or route orchestration belongs in apps; pure re-export contracts remain in
  // the shared package.
  if (!/\/src\/control\//.test(path)) return false;
  const source = readFileSync(file, "utf8");
  return /from ["'](?:next\/|@nestjs\/)|export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/.test(source);
}

function isRetiredDynamicCompatDispatcher(file, source) {
  const basename = file.split(sep).pop() || "";
  return basename === "compat-dispatcher.ts" && /\b(?:import\s*\(|pathToFileURL\s*\()/.test(source);
}

function isPackageExecutableSource(file) {
  return /\/packages\/[^/]+\/src\/bin\//.test(`/${rel(file)}`);
}

function packageExportTargets(value, out = []) {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) packageExportTargets(item, out);
  } else if (value && typeof value === "object") {
    for (const target of Object.values(value)) packageExportTargets(target, out);
  }
  return out;
}

function callName(node) {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return null;
}

function inspectExecutedNode(node, state, skipFunctionBodies = true) {
  if (ts.isCallExpression(node)) {
    const name = callName(node);
    if (name === "getDbInstance") state.dbAccess = true;
    const isGlobalTimer =
      ts.isIdentifier(node.expression) ||
      (ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        ["globalThis", "window"].includes(node.expression.expression.text));
    if (isGlobalTimer && (name === "setInterval" || name === "setTimeout")) state.timers.add(name);
    if (name === "createServer") state.createsServer = true;
    if (name === "listen") state.listens = true;
    if (
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "process" &&
      ["on", "once", "addListener"].includes(node.expression.name.text) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]) &&
      ["SIGINT", "SIGTERM", "SIGHUP"].includes(node.arguments[0].text)
    ) {
      state.processSignals.add(node.arguments[0].text);
    }
  }
  if (skipFunctionBodies && ts.isFunctionLike(node)) return;
  ts.forEachChild(node, (child) => inspectExecutedNode(child, state, skipFunctionBodies));
}

function packageLifecycleFindings(file, source) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const functions = new Map();
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      functions.set(statement.name.text, statement);
    }
  }

  const findings = [];
  const moduleState = { timers: new Set(), processSignals: new Set(), createsServer: false, listens: false };
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!declaration.initializer || !ts.isIdentifier(declaration.name)) continue;
        const state = { timers: new Set(), processSignals: new Set(), createsServer: false, listens: false };
        inspectExecutedNode(declaration.initializer, state);
        inspectExecutedNode(declaration.initializer, moduleState);
        for (const timer of state.timers) {
          findings.push({ signature: `module-timer:${timer}:${declaration.name.text}`, line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1 });
        }
        for (const signal of state.processSignals) {
          findings.push({ signature: `module-process-signal:${signal}:${declaration.name.text}`, line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1 });
        }
        if (state.dbAccess) {
          findings.push({ signature: `module-db-access:${declaration.name.text}`, line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1 });
        }
        if (state.createsServer && state.listens) {
          findings.push({ signature: `module-listener:${declaration.name.text}`, line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1 });
        }
      }
      continue;
    }
    if (!ts.isExpressionStatement(statement)) continue;

    const directState = { timers: new Set(), processSignals: new Set(), createsServer: false, listens: false };
    inspectExecutedNode(statement.expression, directState);
    inspectExecutedNode(statement.expression, moduleState);
    for (const timer of directState.timers) {
      findings.push({ signature: `module-timer:${timer}:expression`, line: sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
    }
    for (const signal of directState.processSignals) {
      findings.push({ signature: `module-process-signal:${signal}:expression`, line: sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
    }
    if (directState.dbAccess) {
      findings.push({ signature: "module-db-access:expression", line: sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
    }
    if (directState.createsServer && directState.listens) {
      findings.push({ signature: "module-listener:expression", line: sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
    }

    const invoked = new Set();
    const collectInvoked = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) invoked.add(node.expression.text);
      if (ts.isFunctionLike(node)) return;
      ts.forEachChild(node, collectInvoked);
    };
    collectInvoked(statement.expression);
    for (const name of invoked) {
      const declaration = functions.get(name);
      if (!declaration?.body) continue;
      const state = { timers: new Set(), processSignals: new Set(), createsServer: false, listens: false };
      inspectExecutedNode(declaration.body, state, false);
      for (const timer of state.timers) {
        findings.push({ signature: `startup-timer:${timer}:${name}`, line: sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
      }
      for (const signal of state.processSignals) {
        findings.push({ signature: `startup-process-signal:${signal}:${name}`, line: sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
      }
      if (state.dbAccess) {
        findings.push({ signature: `startup-db-access:${name}`, line: sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
      }
      if (state.createsServer && state.listens) {
        findings.push({ signature: `startup-listener:${name}`, line: sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1 });
      }
    }
  }
  if (moduleState.createsServer && moduleState.listens && !findings.some(({ signature }) => signature.startsWith("module-listener:"))) {
    findings.push({ signature: "module-listener:source", line: 1 });
  }
  return findings;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  const info = statSync(dir);
  if (info.isFile()) {
    if (sourceExtensions.test(dir)) out.push(dir);
    return out;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!ignored.has(entry.name)) walk(join(dir, entry.name), out);
  }
  return out;
}

function stronglyConnectedComponents(graph) {
  let nextIndex = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const target of [...(graph.get(node) ?? [])].sort()) {
      if (!indices.has(target)) {
        visit(target);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(target)));
      } else if (onStack.has(target)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indices.get(target)));
      }
    }

    if (lowLinks.get(node) !== indices.get(node)) return;
    const component = [];
    while (stack.length > 0) {
      const member = stack.pop();
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    components.push(component.sort());
  }

  for (const node of [...graph.keys()].sort()) {
    if (!indices.has(node)) visit(node);
  }
  return components.sort((left, right) => left[0].localeCompare(right[0]));
}

function packageOwner(file, entries) {
  return entries.find((entry) => file === entry.dir || file.startsWith(`${entry.dir}${sep}`)) ?? null;
}

function importedSpecifiers(source) {
  return [...source.matchAll(importSpecifierPattern)].map((match) => match[1] ?? match[2]).filter(Boolean);
}

function isCoreSourceCliImplementationImport(file, specifier) {
  if (!rel(file).startsWith("packages/core-domain/src/")) return false;
  if (specifier === "@shiguang-gateway/cli" || specifier.startsWith("@shiguang-gateway/cli/")) return true;
  if (!specifier.startsWith(".")) return false;
  const target = rel(resolve(dirname(file), specifier));
  return target.startsWith("packages/core-domain/bin/") || target.startsWith("apps/cli/");
}

if (process.argv.includes("--self-test")) {
  const graph = new Map([
    ["@shiguang-gateway/core-domain", new Set(["@shiguang-gateway/open-sse"])],
    ["@shiguang-gateway/open-sse", new Set(["@shiguang-gateway/core-domain"])],
    ["self", new Set(["self"])],
    ["leaf", new Set()],
  ]);
  assert.deepEqual(stronglyConnectedComponents(graph), [
    ["@shiguang-gateway/core-domain", "@shiguang-gateway/open-sse"],
    ["leaf"],
    ["self"],
  ]);
  assert.equal(graph.get("self").has("self"), true);

  const fixtures = [
    { dir: resolve("/workspace/packages/a"), manifest: { name: "a" } },
    { dir: resolve("/workspace/packages/b"), manifest: { name: "b" } },
  ];
  const sourceFile = resolve(fixtures[0].dir, "src/index.ts");
  assert.equal(packageOwner(resolve(dirname(sourceFile), "./local.js"), fixtures), fixtures[0]);
  assert.equal(packageOwner(resolve(dirname(sourceFile), "../../b/src/internal.js"), fixtures), fixtures[1]);
  assert.deepEqual(importedSpecifiers('import "./side-effect.js"; export { x } from "../b/x.js"; require("./required.cjs")'), [
    "./side-effect.js",
    "../b/x.js",
    "./required.cjs",
  ]);
  const coreCliConsumer = resolve(repoRoot, "packages/core-domain/src/lib/cli-helper/sync.ts");
  assert.equal(isCoreSourceCliImplementationImport(coreCliConsumer, "../../../bin/cli/setup.mjs"), true);
  assert.equal(isCoreSourceCliImplementationImport(coreCliConsumer, "@shiguang-gateway/cli"), true);
  assert.equal(isCoreSourceCliImplementationImport(coreCliConsumer, "@shiguang-gateway/cli-profile-config/codex"), false);
  assert.equal(isAppOwnedSource(resolve(repoRoot, "packages/a/src/feature/route.ts")), true);
  assert.equal(isAppOwnedSource(resolve(repoRoot, "packages/a/src/feature/legacy.route.ts")), true);
  assert.equal(isAppOwnedSource(resolve(repoRoot, "packages/a/src/feature/handler.ts")), false);
  const compatDispatcher = resolve(repoRoot, "packages/web-route-compat/src/compat-dispatcher.ts");
  assert.equal(isRetiredDynamicCompatDispatcher(compatDispatcher, 'await import("./route.js")'), true);
  assert.equal(isRetiredDynamicCompatDispatcher(compatDispatcher, "pathToFileURL(file).href"), true);
  assert.equal(isRetiredDynamicCompatDispatcher(compatDispatcher, "export function dispatch() {}"), false);
  assert.equal(isRetiredDynamicCompatDispatcher(resolve(repoRoot, "packages/a/src/loader.ts"), 'await import("./route.js")'), false);
  assert.equal(isPackageExecutableSource(resolve(repoRoot, "packages/a/src/bin/worker.cjs")), true);
  assert.equal(isPackageExecutableSource(resolve(repoRoot, "packages/a/src/lib/worker.cjs")), false);
  assert.deepEqual(packageExportTargets({ types: "./src/index.ts", import: "./src/index.ts" }), [
    "./src/index.ts",
    "./src/index.ts",
  ]);
  const lifecycleFixture = `
    const sweep = setInterval(run, 1000);
    const request = () => setTimeout(abort, 1000);
    function startServer() { const server = createServer(); server.setTimeout(1000); server.listen(3000); }
    startServer();
    function startSweep() { setTimeout(run, 1000); }
    startSweep();
    function hydrate() { getDbInstance(); }
    hydrate();
  `;
  assert.deepEqual(packageLifecycleFindings("fixture.ts", lifecycleFixture).map(({ signature }) => signature), [
    "module-timer:setInterval:sweep",
    "startup-listener:startServer",
    "startup-timer:setTimeout:startSweep",
    "startup-db-access:hydrate",
  ]);
  assert.deepEqual(
    packageLifecycleFindings("listener.ts", "const server = createServer(); server.listen(3000);").map(({ signature }) => signature),
    ["module-listener:source"],
  );
  assert.deepEqual(
    packageLifecycleFindings("signal.ts", 'process.once("SIGTERM", shutdown);').map(({ signature }) => signature),
    ["module-process-signal:SIGTERM:expression"],
  );
  console.log(JSON.stringify({ status: "PASS", checks: ["core-domain/open-sse SCC", "self-loop", "package ownership", "relative import extraction", "core source cannot import CLI implementations", "core CLI cannot cross into core source by relative path", "route basename ownership", "retired dynamic compat dispatcher", "package export condition targets", "package lifecycle ownership"] }, null, 2));
  process.exit(0);
}

const appEntries = readdirSync(join(repoRoot, "apps"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(repoRoot, "apps", entry.name, "package.json")))
  .map((entry) => ({ dir: join(repoRoot, "apps", entry.name), manifest: readJson(join(repoRoot, "apps", entry.name, "package.json")) }));
const packageEntries = readdirSync(join(repoRoot, "packages"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(repoRoot, "packages", entry.name, "package.json")))
  .map((entry) => ({ dir: join(repoRoot, "packages", entry.name), manifest: readJson(join(repoRoot, "packages", entry.name, "package.json")) }));
const allEntries = [...appEntries, ...packageEntries];
const packageNames = new Set(packageEntries.map((entry) => entry.manifest?.name).filter(Boolean));
const dependents = new Map([...packageNames].map((name) => [name, []]));
const packageDependencyGraph = new Map([...packageNames].map((name) => [name, new Set()]));

for (const entry of allEntries) {
  const deps = { ...(entry.manifest?.dependencies ?? {}), ...(entry.manifest?.optionalDependencies ?? {}) };
  for (const dep of Object.keys(deps)) {
    if (packageNames.has(dep)) dependents.get(dep).push(entry.manifest.name);
  }
}

for (const entry of packageEntries) {
  const name = entry.manifest?.name;
  if (!name) continue;
  const deps = { ...(entry.manifest?.dependencies ?? {}), ...(entry.manifest?.optionalDependencies ?? {}) };
  for (const dependency of Object.keys(deps)) {
    if (packageNames.has(dependency)) packageDependencyGraph.get(name).add(dependency);
  }
}

const dependencyComponents = stronglyConnectedComponents(packageDependencyGraph);
for (const component of dependencyComponents) {
  if (component.length > 1) {
    add(
      "workspace-package-dependency-cycle",
      join(packageEntries.find((entry) => entry.manifest?.name === component[0]).dir, "package.json"),
      `cyclic dependency component: ${component.join(", ")}`,
    );
    continue;
  }
  const [name] = component;
  if (packageDependencyGraph.get(name)?.has(name)) {
    add(
      "workspace-package-self-dependency",
      join(packageEntries.find((entry) => entry.manifest?.name === name).dir, "package.json"),
      `${name} declares itself in dependencies or optionalDependencies`,
    );
  }
}

for (const entry of packageEntries) {
  for (const file of walk(entry.dir)) {
    const source = readFileSync(file, "utf8");
    for (const specifier of importedSpecifiers(source)) {
      if (isCoreSourceCliImplementationImport(file, specifier)) {
        add(
          "core-source-imports-cli-implementation",
          file,
          `core-domain source imports ${specifier}; move shared generators to a focused published package`,
        );
      }
      if (!specifier.startsWith(".")) continue;
      const targetOwner = packageOwner(resolve(dirname(file), specifier), packageEntries);
      if (targetOwner && targetOwner !== entry) {
        add(
          "cross-package-relative-source-import",
          file,
          `${entry.manifest?.name ?? rel(entry.dir)} -> ${targetOwner.manifest?.name ?? rel(targetOwner.dir)} via ${specifier}; use a declared published package contract`,
        );
      }
    }
  }
}

function workspaceConsumers(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const direct = dependents.get(name) ?? [];
  const result = new Set(direct);
  for (const consumer of direct) {
    if (packageNames.has(consumer)) {
      for (const transitive of workspaceConsumers(consumer, seen)) result.add(transitive);
    }
  }
  return [...result];
}

/**
 * Resolve the applications that ultimately consume a package. Package-to-package
 * edges alone do not make a package shared: the rule is about the deployable
 * app boundaries that actually use the capability. A package may still be
 * consumed through a public contract package, so follow the dependency graph
 * and collect only app entries at the leaves.
 */
function appConsumers(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const result = new Set();
  for (const consumer of dependents.get(name) ?? []) {
    if (appEntries.some((entry) => entry.manifest?.name === consumer)) {
      result.add(consumer);
      continue;
    }
    if (packageNames.has(consumer)) {
      for (const app of appConsumers(consumer, seen)) result.add(app);
    }
  }
  return [...result];
}

const legacyMixed = new Set();

for (const entry of packageEntries) {
  for (const [subpath, value] of Object.entries(entry.manifest?.exports ?? {})) {
    if (subpath.endsWith(".ts") || subpath.includes("/lib/")) {
      add("implementation-layout-package-export", join(entry.dir, "package.json"), `${subpath} leaks a source filename or lib directory; expose a stable capability subpath`);
    }
    for (const target of packageExportTargets(value)) {
      if (!target.startsWith("./") || target.includes("*")) continue;
      const resolvedTarget = resolve(entry.dir, target);
      if (!existsSync(resolvedTarget)) {
        add("missing-package-export-target", join(entry.dir, "package.json"), `${subpath} -> ${target}`);
      }
    }
  }
  for (const file of walk(join(entry.dir, "src"))) {
    const source = readFileSync(file, "utf8");
    if (isRetiredDynamicCompatDispatcher(file, source)) {
      add("retired-dynamic-compat-dispatcher", file, "move route loading and dynamic module resolution into the owning app; packages may expose only static compatibility contracts");
    }
    if (!isPackageExecutableSource(file)) {
      for (const finding of packageLifecycleFindings(file, source)) {
        add("package-import-time-lifecycle", file, `${finding.signature} at line ${finding.line}; move startup ownership into an app lifecycle`);
      }
    }
  }
}

// Legacy packages are still consumed by applications, so do not let their
// transitional status hide the two boundary leaks that are cheapest to detect:
// app-owned source trees and catch-all package exports.  These are audit-only
// findings; removing an export or moving a route requires an import migration.
for (const entry of packageEntries) {
  const name = entry.manifest?.name;
  if (!legacyMixed.has(name)) continue;
  for (const file of walk(join(entry.dir, "src"))) {
    if (isAppOwnedSource(file)) {
      add("legacy-app-owned-code", file, `${name} exposes app-owned routes/orchestration from a transitional package; migrate this file into apps/*`);
    }
  }
  const exportsField = entry.manifest?.exports;
  if (exportsField && Object.prototype.hasOwnProperty.call(exportsField, "./*")) {
    add("legacy-wildcard-export", join(entry.dir, "package.json"), `${name} exposes every internal subpath through ./*; replace with an explicit reviewed surface as imports migrate`);
  }
}

for (const entry of packageEntries) {
  const name = entry.manifest?.name;
  const consumers = workspaceConsumers(name);
  const applications = appConsumers(name);
  if (legacyMixed.has(name)) {
    add("legacy-mixed-package", join(entry.dir, "package.json"), `${name} still mixes app-owned routes/orchestration; migrate it before completion`);
    continue;
  }
  if (applications.length < 2) {
    add("package-not-shared", join(entry.dir, "package.json"), `${name} has ${applications.length} app consumer(s); packages require at least two deployable app consumers`);
  }
  for (const file of walk(join(entry.dir, "src"))) {
    if (isAppOwnedSource(file)) {
      add("app-owned-code-in-shared-package", file, "move app-specific routes/handlers into the owning apps/* module");
    }
  }
}

const result = {
  status: violations.length === 0 ? "PASS" : "FAIL",
  rule: "packages contain only capabilities shared by multiple workspace units; app-specific code belongs in apps",
  rules: [
    "packages contain only capabilities shared by multiple workspace units; app-specific code belongs in apps",
    "dependencies and optionalDependencies between workspace packages must form an acyclic graph without self-dependencies",
    "a package may not import another package through a relative source path; use a declared published contract",
    "core-domain source may not import executable CLI implementations from package bin or apps/cli",
    "packages may not contain route.ts modules or retired dynamic compat dispatchers",
    "every explicit package export condition must resolve to an existing file",
    "package source imports may not start timers, listeners, or database access; applications own lifecycle",
  ],
  workspacePackageDependencyGraph: {
    nodes: [...packageDependencyGraph.keys()].sort(),
    edges: [...packageDependencyGraph.entries()]
      .flatMap(([from, targets]) => [...targets].map((to) => ({ from, to })))
      .sort((left, right) => `${left.from}\0${left.to}`.localeCompare(`${right.from}\0${right.to}`)),
    stronglyConnectedComponents: dependencyComponents,
  },
  packages: packageEntries.map((entry) => ({
    name: entry.manifest?.name,
    consumers: workspaceConsumers(entry.manifest?.name),
    appConsumers: appConsumers(entry.manifest?.name),
    classification: legacyMixed.has(entry.manifest?.name) ? "legacy-mixed" : "shared",
  })),
  violations,
};
console.log(JSON.stringify(result, null, 2));
if (strict && violations.length > 0) process.exitCode = 1;
