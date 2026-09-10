import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-combo-row-id-"));
const originalDataDir = process.env.DATA_DIR;
process.env.DATA_DIR = dataDir;

const db = await import("../src/lib/db/core.ts");
const comboRepository = await import("../src/lib/db/repositories/sqliteComboRepository.ts");

test.after(() => {
  db.resetDbInstance();
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("getCombos/getComboById/getComboByName prioritize the SQLite primary key over a stale inner JSON id", async () => {
  const rowId = "2dafe555-77d1-4e42-b795-1e5b99e2b649";
  const staleInnerId = "da8b4aad-52bc-423c-b9f5-74e2654bbd00";

  // Simulate a duplicated/imported combo whose data JSON still carries the template's id.
  const dataPayload = JSON.stringify({
    id: staleInnerId,
    name: "row-id-precedence",
    description: "Combo with a mismatched inner JSON id",
    models: [{ provider: "openai", model: "gpt-4o" }],
    strategy: "priority",
  });

  db.getDbInstance()
    .prepare(
      `INSERT INTO combos (id, name, data, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))`
    )
    .run(rowId, "row-id-precedence", dataPayload);

  // 1. getCombos must surface the authoritative table primary key.
  const list = await comboRepository.getCombos();
  const found = list.find((combo) => combo.name === "row-id-precedence");
  assert.ok(found, "combo should be returned by getCombos");
  assert.equal(
    found.id,
    rowId,
    "getCombos must return the database row id so frontend operations target the real primary key"
  );

  // 2. Fetching by the primary key must return a record whose id matches the row.
  const byId = await comboRepository.getComboById(rowId);
  assert.ok(byId, "combo should be found by primary key rowId");
  assert.equal(byId.id, rowId, "getComboById must normalize id to the table primary key");

  // 3. Name lookups must normalize the id the same way.
  const byName = await comboRepository.getComboByName("row-id-precedence");
  assert.ok(byName, "combo should be found by name");
  assert.equal(byName.id, rowId, "getComboByName must normalize id to the table primary key");

  // 4. Deleting with the id returned by getCombos must hit the real row.
  assert.equal(
    await comboRepository.deleteCombo(found.id as string),
    true,
    "deleteCombo with the id from getCombos must delete the row"
  );
});
