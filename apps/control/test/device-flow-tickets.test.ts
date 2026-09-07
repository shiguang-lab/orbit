import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  claimDeviceFlowTicket,
  completeDeviceFlowTicket,
  createDeviceFlowTicket,
  getDeviceFlowTicketStatus,
  releaseDeviceFlowTicket,
} from "../src/oauth/device-flow-tickets.js";

const originalNow = Date.now;

afterEach(() => {
  Date.now = originalNow;
  delete (globalThis as { __codexDeviceFlowTickets?: unknown }).__codexDeviceFlowTickets;
});

test("enforces the single-use claim, release, and completion state machine", () => {
  const { token } = createDeviceFlowTicket("codex", "existing-connection");
  assert.equal(claimDeviceFlowTicket(token, "other-provider"), null);
  assert.equal(claimDeviceFlowTicket(token, "codex")?.status, "claimed");
  assert.equal(claimDeviceFlowTicket(token, "codex"), null);

  releaseDeviceFlowTicket(token);
  assert.equal(claimDeviceFlowTicket(token, "codex")?.status, "claimed");
  completeDeviceFlowTicket(token, { connectionId: "saved-connection", email: "user@example.com" });
  assert.deepEqual(getDeviceFlowTicketStatus(token), {
    status: "completed",
    result: { connectionId: "saved-connection", email: "user@example.com" },
  });
  assert.equal(claimDeviceFlowTicket(token, "codex"), null);
});

test("expires tickets at the fifteen-minute boundary", () => {
  Date.now = () => 1_000;
  const { token, expiresAt } = createDeviceFlowTicket("codex");
  assert.equal(expiresAt, 1_000 + 15 * 60 * 1_000);
  Date.now = () => expiresAt;
  assert.deepEqual(getDeviceFlowTicketStatus(token), { status: "expired", result: null });
});
