import assert from "node:assert/strict";
import test from "node:test";

import {
  createNodeSqliteAdapterFromDatabase,
  type NodeSqliteDatabaseLike,
} from "../src/lib/db/adapters/nodeSqliteShared.ts";

test("node sqlite adapter close is idempotent", () => {
  let adapterCloseCount = 0;
  let databaseCloseCount = 0;
  let finalizeCount = 0;
  const statement = {
    run: () => ({ changes: 0, lastInsertRowid: 0 }),
    get: () => undefined,
    all: () => [],
    finalize: () => {
      finalizeCount += 1;
    },
  };
  const database: NodeSqliteDatabaseLike = {
    prepare: () => statement,
    exec: () => undefined,
    close: () => {
      databaseCloseCount += 1;
    },
  };
  const adapter = createNodeSqliteAdapterFromDatabase(database, ":memory:", () => {
    adapterCloseCount += 1;
  });
  adapter.prepare("SELECT 1");

  adapter.close();
  adapter.close();

  assert.equal(adapter.open, false);
  assert.equal(adapterCloseCount, 1);
  assert.equal(databaseCloseCount, 1);
  assert.equal(finalizeCount, 1);
});
