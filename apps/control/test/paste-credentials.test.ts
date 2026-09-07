import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CREDENTIAL_BLOB_PREFIX,
  decodeCredentialBlob,
  encodeCredentialBlob,
} from "@orbit/auth/credential-blob";
import {
  PASTE_CREDENTIAL_PROVIDERS,
  parsePastedCredentials,
} from "../src/oauth/paste-credentials.js";

function rawBlob(payload: unknown): string {
  return `${CREDENTIAL_BLOB_PREFIX}${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}

test("round-trips the shared credential blob without changing token fields", () => {
  const input = {
    provider: " antigravity ",
    tokens: {
      access_token: "secret-access-token",
      refresh_token: "secret-refresh-token",
      expires_in: 3600,
      provider_account_id: "account-1",
    },
  };

  const encoded = encodeCredentialBlob(input);
  assert.match(encoded, /^shiguangGateway-cred-v1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeCredentialBlob(encoded), {
    provider: "antigravity",
    tokens: input.tokens,
  });
});

test("accepts only the explicit paste providers and requires an exact provider match", () => {
  const antigravity = encodeCredentialBlob({
    provider: "antigravity",
    tokens: { access_token: "access" },
  });
  const alias = encodeCredentialBlob({
    provider: "agy",
    tokens: { access_token: "access" },
  });

  assert.deepEqual([...PASTE_CREDENTIAL_PROVIDERS], ["antigravity", "agy"]);
  assert.equal(parsePastedCredentials("antigravity", antigravity).tokens.access_token, "access");
  assert.equal(parsePastedCredentials("agy", alias).provider, "agy");
  assert.throws(
    () => parsePastedCredentials("codex", antigravity),
    /paste-credentials not supported for provider: codex/,
  );
  assert.throws(
    () => parsePastedCredentials("agy", antigravity),
    /Pasted credential provider mismatch/,
  );
});

test("rejects malformed, tampered, and unsupported credential payloads", () => {
  assert.throws(() => decodeCredentialBlob("plain-text"), /invalid format/);
  assert.throws(
    () => decodeCredentialBlob(`${CREDENTIAL_BLOB_PREFIX}not+base64`),
    /not base64url/,
  );
  assert.throws(
    () => decodeCredentialBlob(rawBlob({ v: 2, provider: "antigravity", tokens: { access_token: "x" } })),
    /unsupported blob version 2/,
  );
  assert.throws(
    () => decodeCredentialBlob(rawBlob({ v: 1, provider: "antigravity", tokens: {} })),
    /missing access_token/,
  );
  assert.throws(
    () => encodeCredentialBlob({ provider: "", tokens: { access_token: "x" } }),
    /non-empty provider is required/,
  );
});
