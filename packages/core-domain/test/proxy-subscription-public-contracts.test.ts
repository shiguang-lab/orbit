import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
) as { exports: Record<string, { types?: string; import?: string } | string> };

const contracts = [
  {
    subpath: "./proxy-subscriptions/management",
    types: "./src/public/proxySubscriptionManagement.d.ts",
    source: "./src/proxySubscriptions/management.ts",
    runtimeKeys: [
      "createSubscription",
      "deleteSubscription",
      "firstIssueMessage",
      "getSubscriptionById",
      "listSubscriptions",
      "proxySubscriptionCreateSchema",
      "proxySubscriptionUpdateSchema",
      "redactSubscriptionUrl",
      "syncSubscription",
      "updateSubscription",
    ],
  },
  {
    subpath: "./worker/proxy-subscription-lifecycle",
    types: "./src/public/proxySubscriptionLifecycle.d.ts",
    source: "./src/worker/proxySubscriptionLifecycle.ts",
    runtimeKeys: ["startSubscriptionScheduler", "stopSubscriptionScheduler"],
  },
] as const;

const retiredAliases = [
  "./control/proxy-subscriptions",
  "./worker/proxy-subscription",
] as const;

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".turbo"].includes(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(target));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) files.push(target);
  }
  return files;
}

test("proxy subscription management and lifecycle expose disjoint exact contracts", async () => {
  const runtimeKeys: string[][] = [];
  for (const contract of contracts) {
    const entry = manifest.exports[contract.subpath];
    assert.deepEqual(entry, { types: contract.types, import: contract.source });

    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.source)).href);
    const actualRuntimeKeys = Object.keys(runtime).sort();
    runtimeKeys.push(actualRuntimeKeys);
    assert.deepEqual(actualRuntimeKeys, [...contract.runtimeKeys].sort(), contract.subpath);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    const declaredValues = [
      ...declaration.matchAll(/export (?:function|const) (\w+)/g),
    ].map((match) => match[1]);
    assert.deepEqual(declaredValues.sort(), [...contract.runtimeKeys].sort(), contract.types);
  }
  assert.deepEqual(runtimeKeys[0].filter((key) => runtimeKeys[1].includes(key)), []);
});

test("proxy subscription lifecycle is worker-owned and retired aliases stay absent", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);

  const retiredImportPattern = new RegExp(
    `core-domain/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  const lifecycleSpecifier =
    "@shiguang-gateway/core-domain/worker/proxy-subscription-lifecycle";
  const externalFiles = [
    ...sourceFiles(path.join(repoRoot, "apps")),
    ...sourceFiles(path.join(repoRoot, "packages/open-sse")),
  ];
  const lifecycleConsumers: string[] = [];
  for (const file of externalFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, retiredImportPattern, file);
    if (source.includes(lifecycleSpecifier)) lifecycleConsumers.push(path.relative(repoRoot, file));
  }
  assert.deepEqual(lifecycleConsumers, ["apps/worker/src/jobs/registry.ts"]);

  const collectionHandler = fs.readFileSync(
    path.join(repoRoot, "apps/control-api/src/proxy-subscriptions/handlers/collection.handler.ts"),
    "utf8",
  );
  assert.doesNotMatch(collectionHandler, /startSubscriptionScheduler/);
});
