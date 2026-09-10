import assert from "node:assert/strict";
import test from "node:test";
import { ChatAdmissionController } from "../src/shared/middleware/chatBodyAdmission.js";
import {
  chatAdmissionRejectionResponse,
  structuralRejectionResponse,
} from "../src/shared/middleware/chatAdmissionResponses.js";

test("retry hint reflects live heavy-lease occupancy and caps at 60 seconds", () => {
  const controller = new ChatAdmissionController(1, undefined, 0, () => {});
  const startedAt = Date.now();
  const lease = controller.tryAcquireHeavy();
  assert.ok(lease);
  assert.equal(controller.retryAfterSeconds(0, startedAt + 7_000), 7);
  assert.equal(controller.retryAfterSeconds(75_000, startedAt + 120_000), 60);
  lease.release();
  assert.equal(controller.retryAfterSeconds(0, startedAt + 120_000), 1);
});

test("response builders keep historical floors and accept occupancy hints", () => {
  assert.equal(chatAdmissionRejectionResponse(503, 1_000, 1).headers.get("Retry-After"), "2");
  assert.equal(chatAdmissionRejectionResponse(503, 1_000, 18).headers.get("Retry-After"), "18");
  assert.equal(structuralRejectionResponse(503, 200, 0).headers.get("Retry-After"), "1");
  assert.equal(structuralRejectionResponse(503, 200, 18).headers.get("Retry-After"), "18");
  assert.equal(chatAdmissionRejectionResponse(413, 1_000, 18).headers.get("Retry-After"), null);
});

test("structural 503 identifies local admission as the source", async () => {
  const response = structuralRejectionResponse(503, 200, 1);
  const body = (await response.json()) as { error?: { message?: string; code?: string } };
  assert.equal(response.status, 503);
  assert.equal(body.error?.code, "chat_admission_busy");
  assert.equal(
    body.error?.message,
    "Local chat admission capacity is busy for this structurally heavy request; upstream provider routing was not attempted. Retry shortly."
  );
});
