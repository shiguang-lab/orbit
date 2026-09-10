import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("continued Responses turns persist their effective reconstructed input", () => {
  const chat = readFileSync(new URL("../src/handlers/chat.ts", import.meta.url), "utf8");
  const core = readFileSync(new URL("../../core/src/lib/db/responsesContinuationStore.ts", import.meta.url), "utf8");
  const logger = readFileSync(new URL("../src/utils/requestLogger.ts", import.meta.url), "utf8");

  assert.match(chat, /effectiveInput:\s*\(body as \{ input: unknown\[\] \}\)\.input/);
  assert.match(logger, /effectiveInput: cloneBoundedForLog\(effectiveInput\)/);
  assert.match(
    core,
    /Array\.isArray\(clientRawRequest\?\.effectiveInput\)[\s\S]*clientRawRequest\.effectiveInput[\s\S]*clientRawRequest\.body\.input/
  );
});

test("video transcript redaction also covers effective continuation input", () => {
  const chat = readFileSync(new URL("../src/handlers/chat.ts", import.meta.url), "utf8");
  assert.match(chat, /redactVideoTranscriptFieldsForLog\(\{\s*input: clientRawRequest\.effectiveInput/);
});
