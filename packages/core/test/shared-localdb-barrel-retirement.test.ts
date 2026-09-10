import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migratedFiles = [
  "src/domain/quotaCache.ts",
  "src/shared/services/cloudSyncScheduler.ts",
  "src/shared/services/initializeCloudSync.ts",
  "src/shared/services/apiKeyResolver.ts",
  "src/shared/services/modelSyncOperation.ts",
  "src/shared/utils/apiKeyPolicy.ts",
];

test("domain/shared runtime modules import their owning DB modules, not localDb barrel", async () => {
  for (const file of migratedFiles) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(!source.match(/(?:from|import\()[^\n]*localDb/), file);
  }
});
