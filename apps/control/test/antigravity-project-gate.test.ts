import assert from "node:assert/strict";
import test from "node:test";
import {
  antigravityDegradedProjectState,
  antigravityPersistStatus,
} from "../src/oauth/antigravity-project-gate.ts";

test("Antigravity empty project id degrades even without an outcome flag", () => {
  const degraded = antigravityDegradedProjectState("agy", {
    providerSpecificData: { projectId: " " },
  });
  assert.equal(degraded?.testStatus, "degraded");
  assert.equal(degraded?.errorCode, "missing_project_id");
});

test("healthy Antigravity persistence clears stale degraded errors", () => {
  assert.equal(
    antigravityDegradedProjectState("antigravity", { projectId: "cloud-project" }),
    null
  );
  assert.deepEqual(antigravityPersistStatus(null), {
    testStatus: "active",
    errorCode: null,
    lastErrorType: null,
    lastError: null,
  });
});
