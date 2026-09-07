import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDashboardLiveUrl } from "../src/entities/live-url.ts";

test("production dashboard uses same-origin TLS without the internal realtime port", () => {
  assert.equal(buildDashboardLiveUrl("https://gateway.example/dashboard?token=private#section"), "wss://gateway.example/live-ws");
});

test("local dashboard retains its public proxy port", () => {
  assert.equal(buildDashboardLiveUrl("http://127.0.0.1:5173/dashboard"), "ws://127.0.0.1:5173/live-ws");
});
