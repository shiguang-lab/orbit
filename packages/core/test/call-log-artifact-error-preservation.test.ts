import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * #12027 — oversized call-log artifacts must never drop the error. It is the only
 * field that says WHY a request failed (e.g. a 110s fetch timeout), and it is tiny
 * next to the request/response bodies that actually blew the cap.
 */

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-calllog-artifact-"));
const originalDataDir = process.env.DATA_DIR;
const originalPipelineCap = process.env.CALL_LOG_PIPELINE_MAX_SIZE_KB;
process.env.DATA_DIR = dataDir;
process.env.CALL_LOG_PIPELINE_MAX_SIZE_KB = "1";

const { CALL_LOGS_DIR, readCallArtifact, writeCallArtifact } = await import(
  "../src/lib/usage/callLogArtifacts.ts"
);

test.after(() => {
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalPipelineCap === undefined) delete process.env.CALL_LOG_PIPELINE_MAX_SIZE_KB;
  else process.env.CALL_LOG_PIPELINE_MAX_SIZE_KB = originalPipelineCap;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const UPSTREAM_ERROR =
  "[504]: Fetch timeout after 110000ms on https://opencode.ai/zen/go/v1/chat/completions";

function buildOversizedArtifact(id: string, error: unknown) {
  const huge = "x".repeat(64 * 1024);
  return {
    schemaVersion: 5 as const,
    summary: {
      id,
      timestamp: "2026-03-31T10:08:30.000Z",
      method: "POST",
      path: "/v1/chat/completions",
      status: 504,
      model: "openai/gpt-4o",
      requestedModel: "openai/gpt-4o",
      provider: "opencode-go",
      account: "acct-1",
      connectionId: "conn-1",
      duration: 110_000,
      tokens: {
        in: 1,
        out: 0,
        cacheRead: null,
        cacheWrite: null,
        reasoning: null,
        compressed: null,
      },
      requestType: "chat",
      sourceFormat: "openai",
      targetFormat: "openai",
      apiKeyId: null,
      apiKeyName: null,
      comboName: null,
      comboStepId: null,
      comboExecutionKey: null,
    },
    requestBody: { payload: "request" },
    responseBody: { output: "response" },
    error,
    pipeline: {
      providerRequest: { body: huge },
      providerResponse: { body: huge },
    },
  };
}

test("a size-limit-fallback artifact keeps the upstream error verbatim", () => {
  assert.ok(CALL_LOGS_DIR, "precondition: call logs are writable in this environment");

  const artifact = buildOversizedArtifact("tiny-cap-preserves-error", UPSTREAM_ERROR);
  const written = writeCallArtifact(artifact);
  assert.ok(written, "artifact must be written");
  assert.ok(written.sizeBytes <= 1024, `artifact must respect the 1KB cap (${written.sizeBytes})`);

  const { artifact: stored, state } = readCallArtifact(written.relPath);
  assert.equal(state, "ready");
  assert.ok(stored, "artifact must round-trip");
  assert.equal(
    stored.error,
    UPSTREAM_ERROR,
    "the upstream error must survive the size-limit fallback"
  );
  // The 64KB pipeline bodies — the thing that actually blew the cap — must be
  // replaced by the omission marker; the error must not be collateral damage.
  const pipeline = (stored as { pipeline?: { error?: { _orbit_truncated?: boolean } } }).pipeline;
  assert.equal(pipeline?.error?._orbit_truncated, true, "oversized pipeline must be omitted");
  assert.equal(
    (pipeline as { providerRequest?: unknown })?.providerRequest,
    undefined,
    "oversized pipeline bodies must be dropped"
  );
});

test("a pathological summary still leaves the error diagnosable", () => {
  const artifact = buildOversizedArtifact("pathological-summary", UPSTREAM_ERROR);
  // Force the summary itself to blow the 1KB cap.
  artifact.summary.model = "gpt".repeat(2_000);

  const written = writeCallArtifact(artifact);
  assert.ok(written, "artifact must be written");

  const { artifact: stored, state } = readCallArtifact(written.relPath);
  assert.equal(state, "ready");
  assert.ok(stored, "artifact must round-trip");
  assert.equal(stored.error, UPSTREAM_ERROR, "the error must be the last thing to go");
  assert.equal((stored as { summary?: unknown }).summary, undefined);
});

test("a very long error is truncated, not dropped", () => {
  const longError = "E".repeat(16 * 1024);
  const artifact = buildOversizedArtifact("long-error", longError);

  // The 4KB truncation cap means the fallback artifact needs a budget larger
  // than the cap for the error to survive; a 1KB cap (tested above) is only
  // large enough for a small error. Use an 8KB budget so the truncation path —
  // not the whole-artifact drop — is what this case exercises.
  process.env.CALL_LOG_PIPELINE_MAX_SIZE_KB = "8";
  let written: { relPath: string } | null = null;
  try {
    written = writeCallArtifact(artifact);
  } finally {
    process.env.CALL_LOG_PIPELINE_MAX_SIZE_KB = "1";
  }
  assert.ok(written);

  const { artifact: stored } = readCallArtifact(written.relPath);
  assert.equal(typeof stored?.error, "string");
  assert.ok((stored!.error as string).length > 0, "error must not be emptied");
  assert.ok(
    (stored!.error as string).length < longError.length,
    "an oversized error must be truncated to respect the cap"
  );
});
