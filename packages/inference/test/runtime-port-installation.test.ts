import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");

test("runtime port modules install explicitly and idempotently", async () => {
  const { providerRuntimePorts } = await import(
    "@orbit/core/runtime/provider-ports"
  );
  assert.throws(() => providerRuntimePorts.parseModel("openai/gpt-4o"), /before runtime registration/);

  const { installRuntimePorts } = await import("../src/services/dbRuntimeHooks.ts");
  assert.throws(() => providerRuntimePorts.parseModel("openai/gpt-4o"), /before runtime registration/);
  installRuntimePorts();
  installRuntimePorts();
  assert.deepEqual(providerRuntimePorts.parseModel("openai/gpt-4o"), {
    provider: "openai",
    model: "gpt-4o",
    isAlias: false,
    providerAlias: "openai",
    extendedContext: false,
  });
});

test("runtime settings port does not register at import time", async () => {
  const { applyProviderModelAliases } = (await import(
    "@orbit/core/runtime/provider-settings-port"
  )) as unknown as {
    applyProviderModelAliases(value: Record<string, string>): Promise<void>;
  };
  assert.throws(() => applyProviderModelAliases({}), /before registration/);

  const { installRuntimeSettingsPort } = await import("../src/services/runtimeSettingsHooks.ts");
  assert.throws(() => applyProviderModelAliases({}), /before registration/);
  installRuntimeSettingsPort();
  installRuntimeSettingsPort();
  await assert.doesNotReject(applyProviderModelAliases({}));
});

test("application owners call installers and app modules have no side-effect hook imports", () => {
  const dbOwners = [
    "apps/control/src/bootstrap.ts",
    "apps/gateway/src/bootstrap.ts",
    "apps/realtime/src/bootstrap.ts",
    "apps/worker/src/bootstrap.ts",
  ];
  for (const relativePath of dbOwners) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(source, /import \{ installRuntimePorts \} from /, relativePath);
    assert.match(source, /\binstallRuntimePorts\(\)/, relativePath);
  }

  const settingsOwners = [
    "apps/gateway/src/runtime/edge-runtime.service.ts",
    "apps/worker/src/main.ts",
  ];
  for (const relativePath of settingsOwners) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(source, /\binstallRuntimeSettingsPort\b[\s\S]*?from ["']@orbit\/inference\/services\/runtime-settings-hooks["']/, relativePath);
    assert.match(source, /\binstallRuntimeSettingsPort\(\)/, relativePath);
  }

  const edgeRuntime = fs.readFileSync(
    path.join(repoRoot, "apps/gateway/src/runtime/edge-runtime.service.ts"),
    "utf8",
  );
  assert.match(edgeRuntime, /\binstallResilienceRuntimeSettingsPort\(\)/);
  const controlRuntime = fs.readFileSync(
    path.join(repoRoot, "apps/control/src/infrastructure/control-runtime.service.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    controlRuntime,
    /@orbit\/inference|\binstallRuntimeSettingsPort\b|\binstallResilienceRuntimeSettingsPort\b|\bhydrateRequestRuntime\b/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(repoRoot, "apps/control/src/bootstrap.ts"), "utf8"),
    /\binstallMemoryRuntimePort\b/,
  );

  for (const relativePath of [
    "apps/control/src/app.module.ts",
    "apps/gateway/src/app.module.ts",
    "apps/realtime/src/app.module.ts",
    "apps/worker/src/app.module.ts",
  ]) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(repoRoot, relativePath), "utf8"),
      /import\s*["']@orbit\/inference\/services\/(?:dbRuntimeHooks|runtime-settings-hooks)["']/,
      relativePath,
    );
  }
});
