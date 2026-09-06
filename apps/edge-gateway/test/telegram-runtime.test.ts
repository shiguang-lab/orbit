import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { proxyChat } from "../src/telegram/runtime/chat-proxy.js";
import { parseInitData, verifyInitData } from "../src/telegram/runtime/init-data.js";

function signedInitData(fields: Record<string, string>, botToken: string) {
  const check = Object.entries(fields)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}

test("Telegram initData verifies its HMAC and freshness", () => {
  const botToken = `123:${"a".repeat(35)}`;
  const now = Math.floor(Date.now() / 1000);
  const valid = signedInitData({ auth_date: String(now), query_id: "query", user: '{"id":42}' }, botToken);

  assert.equal(verifyInitData(valid, botToken), true);
  assert.equal(parseInitData(valid).query_id, "query");
  assert.equal(verifyInitData(valid.replace("query", "tampered"), botToken), false);

  const expired = signedInitData({ auth_date: String(now - 120), query_id: "old" }, botToken);
  assert.equal(verifyInitData(expired, botToken, 60), false);
});

test("Telegram chat proxy ignores empty prompts before creating credentials", async () => {
  let called = false;
  const response = await proxyChat(42, "   ", async () => {
    called = true;
    return Response.json({});
  });
  assert.equal(response, "");
  assert.equal(called, false);
});
