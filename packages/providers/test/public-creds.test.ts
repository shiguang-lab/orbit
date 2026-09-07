import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { resolvePublicCred, type EmbeddedDefaultKey } from "../src/utils/publicCreds.ts";

const EXPECTED_PUBLIC_CREDENTIAL_HASHES: Record<EmbeddedDefaultKey, string> = {
  gemini_id: "636d7183f3ca",
  gemini_alt: "6a5f78b8b99d",
  antigravity_id: "bf00c418024b",
  antigravity_alt: "1d2f041093fd",
  claude_id: "473668f2b13c",
  codex_id: "584341c2f0e8",
  kimi_id: "9a51d8fba526",
  github_copilot_id: "9954bfea80f3",
  grok_id: "61a78c797373",
  openference_id: "4de1456cd3e4",
  trae_id: "17112308c0b6",
  m365_oauth_client_id: "dd3cc7049243",
  adobe_firefly_api_key: "9c5827b30bd7",
  adobe_firefly_express_client_id: "ceb1777fe9d3",
  adobe_firefly_balance_api_key: "c26d5d557116",
};

test("embedded public OAuth credentials decode to the expected upstream values", () => {
  for (const [key, expectedHash] of Object.entries(EXPECTED_PUBLIC_CREDENTIAL_HASHES)) {
    const decoded = resolvePublicCred(key as EmbeddedDefaultKey);
    const hash = createHash("sha256").update(decoded).digest("hex").slice(0, 12);
    assert.equal(hash, expectedHash, key);
  }
});
