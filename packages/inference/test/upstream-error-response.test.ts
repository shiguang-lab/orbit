import assert from "node:assert/strict";
import test from "node:test";

import { buildSanitizedUpstreamErrorResponse } from "../src/utils/upstreamErrorResponse.ts";

test("JSON upstream errors preserve safe shape while dropping sensitive fields", async () => {
  const response = buildSanitizedUpstreamErrorResponse({
    status: 401,
    rawBody: JSON.stringify({
      error: "invalid sk-secret123456789",
      requestId: "request-1",
      accessToken: "private-token",
      nested: { path: "/Users/private/source.ts", reason: "denied" },
    }),
    fallbackMessage: "Provider rejected the request",
  });
  const body = await response.json();
  const serialized = JSON.stringify(body);
  assert.equal(body.requestId, "request-1");
  assert.equal(serialized.includes("sk-secret123456789"), false);
  assert.equal(serialized.includes("private-token"), false);
  assert.equal(serialized.includes("/Users/private"), false);
});

test("opaque HTML or text upstream errors are replaced by a canonical JSON envelope", async () => {
  const response = buildSanitizedUpstreamErrorResponse({
    status: 502,
    rawBody: "<html>internal host private.local and secret</html>",
    fallbackMessage: "Provider returned HTTP 502",
  });
  assert.equal(response.headers.get("content-type"), "application/json");
  const body = await response.json();
  assert.equal(body.error.message, "Provider returned HTTP 502");
  assert.equal(JSON.stringify(body).includes("private.local"), false);
});
