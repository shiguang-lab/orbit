import assert from "node:assert/strict";
import test from "node:test";

import {
  CODEX_PUBLIC_ERROR_MESSAGE,
  projectCodexPublicError,
} from "../src/utils/codexPublicError.ts";
import { formatErrorResponse } from "../src/vendor/codex-chatgpt-web/bridge.ts";

test("Codex public error keeps only an allow-listed status/code pairing", () => {
  assert.deepEqual(
    projectCodexPublicError({
      status: 429,
      code: "rate_limit_exceeded",
      type: "attacker-controlled",
    }),
    {
      message: CODEX_PUBLIC_ERROR_MESSAGE,
      type: "rate_limit_error",
      code: "rate_limit_exceeded",
    }
  );

  assert.deepEqual(
    projectCodexPublicError({ status: 502, code: "rate_limit_exceeded" }),
    {
      message: CODEX_PUBLIC_ERROR_MESSAGE,
      type: "server_error",
      code: "upstream_server_error",
    }
  );
});

test("Codex JSON response never exposes upstream diagnostic text", async () => {
  const response = formatErrorResponse(
    502,
    "provider_error",
    "upstream leaked sk-secret123456789 at /Users/private/source.ts"
  );
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes("sk-secret123456789"), false);
  assert.equal(JSON.stringify(body).includes("/Users/private"), false);
  assert.equal(body.error.message, CODEX_PUBLIC_ERROR_MESSAGE);
});
