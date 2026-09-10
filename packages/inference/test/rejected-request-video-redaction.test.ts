import assert from "node:assert/strict";
import test from "node:test";
import { redactRejectedRequestBodyForLog } from "../src/handlers/rejectedRequestRedaction.ts";

test("pre-guardrail rejected request log bodies redact video transcript fields", () => {
  const secret = "rejected request transcript secret";
  const requestBody = {
    messages: [
      {
        role: "user",
        content: [
          {
            type: "input_video",
            video_url: "https://example.invalid/video.mp4",
            transcript: { cues: [{ text: secret, startSeconds: 0, endSeconds: 1 }] },
          },
        ],
      },
    ],
  };
  const redacted = redactRejectedRequestBodyForLog(requestBody) as typeof requestBody;

  assert.equal(JSON.stringify(redacted).includes(secret), false);
  assert.equal(
    redacted.messages[0].content[0].transcript,
    "[redacted-video-transcript]"
  );
  assert.equal(requestBody.messages[0].content[0].transcript.cues[0].text, secret);
});
