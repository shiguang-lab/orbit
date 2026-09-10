import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-video-redaction-"));
process.env.DATA_DIR = dataDir;
const core = await import("../src/lib/db/core.js");
const { saveCallLog } = await import("../src/lib/usage/callLogs.js");
const { resolvePreviousResponseState } = await import("../src/lib/db/responsesContinuationStore.js");
const { redactVideoTranscriptFieldsForLog, reanchorVideoBridgeRedaction } = await import(
  "../src/lib/guardrails/videoBridgeSnapshotRedaction.js"
);

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("video transcript fields are redacted without mutating the request", () => {
  const body = {
    messages: [{ content: [{ type: "video_url", transcript: "secret", video_url: { audioTranscript: "private" } }] }],
  };
  const redacted = redactVideoTranscriptFieldsForLog(body) as typeof body;
  assert.equal(body.messages[0].content[0].transcript, "secret");
  assert.equal(redacted.messages[0].content[0].transcript, "[redacted-video-transcript]");
  assert.equal(redacted.messages[0].content[0].video_url.audioTranscript, "[redacted-video-transcript]");
});

test("video log redaction re-anchors after later guardrails rewrite the description", () => {
  const original = {
    container: "messages" as const,
    messageIndex: 0,
    partIndex: 0,
    fullText: "description with Alice",
    redactedText: "description with [redacted-video-transcript]",
  };
  const finalText = "description with [NAME_1]";
  const result = reanchorVideoBridgeRedaction([original], {
    messages: [{ content: [{ type: "text", text: finalText }] }],
  });

  assert.equal(result[0].fullText, finalText);
  assert.equal(result[0].redactedText, original.redactedText);
  assert.equal(original.fullText, "description with Alice");
});

test("call log marker persists and continuation fails closed", async () => {
  await saveCallLog({
    id: "video-log",
    method: "POST",
    path: "/v1/responses",
    status: 200,
    model: "video-model",
    provider: "test",
    apiKeyId: "key-1",
    responseId: "resp-video",
    videoContentRemoved: true,
  });
  const row = core.getDbInstance().prepare(
    "SELECT video_content_removed FROM call_logs WHERE id = ?"
  ).get("video-log") as { video_content_removed: number };
  assert.equal(row.video_content_removed, 1);
  assert.equal(resolvePreviousResponseState("resp-video", "key-1"), null);
});
