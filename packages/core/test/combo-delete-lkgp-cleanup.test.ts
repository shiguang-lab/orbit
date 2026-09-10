import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-combo-lkgp-delete-"));
const originalDataDir = process.env.DATA_DIR;
process.env.DATA_DIR = dataDir;

const db = await import("../src/lib/db/core.ts");
const comboRepository = await import("../src/lib/db/repositories/sqliteComboRepository.ts");
const lkgp = await import("../src/lib/db/settings/lkgp.ts");
const cache = await import("../src/lib/db/readCache.ts");

test.after(() => {
  db.resetDbInstance();
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function createCombo(name: string): Promise<string> {
  const combo = await comboRepository.createCombo({
    name,
    models: [{ provider: "openai", model: "gpt-test" }],
  } as Parameters<typeof comboRepository.createCombo>[0]);
  assert.equal(typeof combo.id, "string");
  return combo.id as string;
}

test("deleting a combo removes all of its LKGP pins and invalidates warmed cache", async () => {
  const id = await createCombo("doomed-combo");
  await lkgp.setLKGP("doomed-combo", "model-a", "openai", "conn-a");
  await lkgp.setLKGP("doomed-combo", "model-b", "openai", "conn-b");
  assert.ok(await cache.getCachedLKGP("doomed-combo", "model-a"));

  assert.equal(await comboRepository.deleteCombo(id), true);
  assert.equal(await cache.getCachedLKGP("doomed-combo", "model-a"), null);
  assert.equal(await lkgp.getLKGP("doomed-combo", "model-b"), null);
});

test("combo-name prefix and LIKE wildcards cannot widen LKGP cleanup", async () => {
  const id = await createCombo("prod_%");
  await lkgp.setLKGP("prod_%", "model", "openai", "doomed");
  await lkgp.setLKGP("prod_X", "model", "openai", "survivor-a");
  await lkgp.setLKGP("prod_%-canary", "model", "openai", "survivor-b");

  assert.equal(await comboRepository.deleteCombo(id), true);
  assert.equal(await lkgp.getLKGP("prod_%", "model"), null);
  assert.equal((await lkgp.getLKGP("prod_X", "model"))?.connectionId, "survivor-a");
  assert.equal(
    (await lkgp.getLKGP("prod_%-canary", "model"))?.connectionId,
    "survivor-b"
  );
});

test("deleting an unknown combo leaves existing LKGP state untouched", async () => {
  await lkgp.setLKGP("untouched", "model", "openai", "conn");
  assert.equal(await comboRepository.deleteCombo("missing"), false);
  assert.equal((await lkgp.getLKGP("untouched", "model"))?.connectionId, "conn");
});
