import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-stream-errors-"));
process.env.DATA_DIR = dataDir;
process.env.API_KEY_SECRET = "public-stream-error-test";

const streamHandler = await import("../src/utils/streamHandler.ts");
const attemptLogging = await import("../src/handlers/chatCore/attemptLogging.ts");

test.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

test("generic stream failure frames redact credentials and absolute paths", () => {
  const chunks = streamHandler.buildStreamErrorChunks(
    "request failed with sk-secret123456789 at /Users/private/project/file.ts",
    502,
    "openai"
  );
  const rendered = (Array.isArray(chunks) ? chunks : [chunks])
    .map((chunk) => new TextDecoder().decode(chunk))
    .join("");
  assert.equal(rendered.includes("sk-secret123456789"), false);
  assert.equal(rendered.includes("/Users/private"), false);
});

test("dashboard failure lifecycle event exposes only a sanitized error", () => {
  const event = attemptLogging.resolveRequestLifecycleEvent({
    traceId: "trace-1",
    status: 502,
    error: "request failed with sk-secret123456789 from /Users/private/config.ts",
    latencyMs: 12,
  });
  assert.equal(event.name, "request.failed");
  assert.equal(JSON.stringify(event).includes("sk-secret123456789"), false);
  assert.equal(JSON.stringify(event).includes("/Users/private"), false);
});
