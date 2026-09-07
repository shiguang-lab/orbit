import assert from "node:assert/strict";
import { test } from "node:test";
import { getConnectionHealth, resolveOAuthRedirectUri } from "../src/features/providers/connection-health.ts";

const connection = { id: "agy-1", provider: "agy", name: "account" };

test("an active connection with a refresh failure remains usable and is shown as a warning", () => {
  assert.equal(getConnectionHealth({
    ...connection,
    isActive: true,
    testStatus: "active",
    lastError: "Health check: token refresh failed",
    lastErrorType: "token_refresh_failed",
    errorCode: "refresh_failed",
  }), "warning");
});

test("expired and cooling-down connections are errors", () => {
  assert.equal(getConnectionHealth({ ...connection, testStatus: "expired" }), "error");
  assert.equal(getConnectionHealth({ ...connection, testStatus: "unavailable", rateLimitedUntil: "2026-09-07T12:00:00Z" }, Date.parse("2026-09-07T11:00:00Z")), "error");
});

test("Antigravity uses its registered loopback callback while browser OAuth uses the console origin", () => {
  assert.equal(resolveOAuthRedirectUri("agy", { origin: "https://orbit.example.com", port: "" }), "http://127.0.0.1:20128/callback");
  assert.equal(resolveOAuthRedirectUri("antigravity", { origin: "http://localhost:3000", port: "3000" }), "http://127.0.0.1:3000/callback");
  assert.equal(resolveOAuthRedirectUri("codex", { origin: "https://orbit.example.com", port: "" }), "https://orbit.example.com/callback");
});
