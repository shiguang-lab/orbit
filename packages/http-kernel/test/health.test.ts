import assert from "node:assert/strict";
import test from "node:test";
import { HttpHealthController } from "../src/health/http-health.controller.js";

test("common health controller exposes stable probe payloads", () => {
  const controller = new HttpHealthController();
  assert.deepEqual(controller.live(), { status: "ok" });
  assert.deepEqual(controller.health(), { status: "ok" });
  assert.deepEqual(controller.ready(), { status: "ok" });
});
