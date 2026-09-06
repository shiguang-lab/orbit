import assert from "node:assert/strict";
import { test } from "node:test";

import { initializeControlRuntime } from "@shiguang-gateway/core-domain/control/auth-init";
import {
  GET as getCloudSyncInitialization,
  POST as initializeCloudSync,
} from "../src/sync/handlers/initialize.handler.ts";

test("control runtime initialization delegates background services to worker", async () => {
  assert.deepEqual(await initializeControlRuntime(), {
    status: 200,
    body: {
      initialized: true,
      backgroundServicesOwner: "worker",
    },
  });
});

test("cloud sync initialization preserves status without starting a control scheduler", async () => {
  const post = await initializeCloudSync();
  assert.equal(post.status, 200);
  assert.deepEqual(await post.json(), {
    success: true,
    initialized: true,
    modelSyncInitialized: false,
    backgroundServicesOwner: "worker",
    message: "Cloud sync scheduling is owned by the worker",
  });

  const get = await getCloudSyncInitialization();
  assert.equal(get.status, 200);
  assert.deepEqual(await get.json(), {
    initialized: true,
    modelSyncInitialized: false,
    backgroundServicesOwner: "worker",
    message: "Cloud sync scheduling is owned by the worker",
  });
});
