import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeProviderSpecificDataForResponse } from "../src/lib/providers/requestDefaults.ts";

test("provider API responses strip Qwen and Alibaba console-session credentials", () => {
  const sanitized = sanitizeProviderSpecificDataForResponse({
    qwenCloudCookie: "qwen-cookie",
    qwenCloudSecToken: "qwen-token",
    alibabaConsoleCookie: "alibaba-cookie",
    alibabaConsoleSecToken: "alibaba-token",
    region: "global-sg",
  });
  assert.deepEqual(sanitized, { region: "global-sg" });
});
