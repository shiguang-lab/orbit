import assert from "node:assert/strict";
import test from "node:test";

import {
  redactErrorPaths,
  sanitizeErrorMessage,
  sanitizeUpstreamDetails,
} from "../src/errors/index.js";

test("redacts POSIX, Windows, UNC, and file URI paths without hiding API routes", () => {
  const input = [
    "/home/private/config.json",
    "C:\\Users\\private\\config.json",
    "\\\\server\\share\\secret.txt",
    "file:///Users/private/source.ts",
  ].join(" | ");
  const safe = redactErrorPaths(input);
  assert.equal(safe.includes("private/config"), false);
  assert.equal(safe.includes("Users\\private"), false);
  assert.equal(safe.includes("server\\share"), false);
  assert.equal(safe.includes("file:///Users"), false);
  assert.equal(redactErrorPaths("POST /v1/chat/completions failed"), "POST /v1/chat/completions failed");
});

test("decodes nested security escapes before credential redaction", () => {
  const safe = sanitizeErrorMessage(
    String.raw`authorization\u003dBearer\u0020ghp_123456789012345678901234567890123456`
  );
  assert.equal(safe.includes("ghp_"), false);
});

test("redacts AIza credentials regardless of their exact length", () => {
  for (const credential of [
    "AIza12345678901234567890",
    "AIza12345678901234567890123456789012345",
    "AIza12345678901234567890123456789012345678901234567890",
  ]) {
    const safe = sanitizeErrorMessage(`Bad credentials for ${credential}`);
    assert.equal(safe.includes(credential), false);
    assert.match(safe, /REDACTED/);
  }
});

test("recursive upstream projection drops sensitive keys and handles cycles", () => {
  const value: Record<string, unknown> = {
    reason: "failed at /root/private/config.json",
    cookie: "session-secret",
  };
  value.self = value;
  const serialized = JSON.stringify(sanitizeUpstreamDetails(value));
  assert.equal(serialized.includes("session-secret"), false);
  assert.equal(serialized.includes("/root/private"), false);
});
