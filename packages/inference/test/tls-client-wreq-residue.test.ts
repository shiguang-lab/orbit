import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE_ROOT = join(PACKAGE_ROOT, "..", "..");

test("inference pins wreq-js and removes the tls-client-node sidecar", () => {
  const packageJson = JSON.parse(
    readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8")
  ) as { optionalDependencies: Record<string, string> };
  assert.equal(packageJson.optionalDependencies["wreq-js"], "3.2.0");
  assert.equal(packageJson.optionalDependencies["tls-client-node"], undefined);
  assert.equal(existsSync(join(PACKAGE_ROOT, "src/services/tlsClientDownloadDir.ts")), false);

  for (const relativePath of [
    "src/services/tlsClientBase.ts",
    "src/services/claudeTlsClient.ts",
    "src/services/grokTlsClient.ts",
    "src/services/lmarenaTlsClient.ts",
    "src/services/notionTlsClient.ts",
    "src/services/perplexityTlsClient.ts",
  ]) {
    const source = readFileSync(join(PACKAGE_ROOT, relativePath), "utf8");
    assert.doesNotMatch(source, /tls-client-node/i, `${relativePath}: stale sidecar reference`);
  }
});

test("the pnpm lock contains wreq 3.2 native bindings and no tls-client-node package", () => {
  const lock = readFileSync(join(WORKSPACE_ROOT, "pnpm-lock.yaml"), "utf8");
  assert.match(lock, /wreq-js@3\.2\.0/);
  assert.match(lock, /@wreq-js\/binding-linux-x64-gnu@3\.2\.0/);
  assert.match(lock, /@wreq-js\/binding-darwin-arm64@3\.2\.0/);
  assert.doesNotMatch(lock, /tls-client-node@/);
});

test("persistent sessions and ephemeral transports share one wreq runtime loader", () => {
  const source = readFileSync(join(PACKAGE_ROOT, "src/utils/tlsClient.ts"), "utf8");
  assert.equal(
    source.match(/loadRuntimeModule\("wreq-js"\)/g)?.length,
    1,
    "wreq-js must be resolved through one cached module loader"
  );
});
