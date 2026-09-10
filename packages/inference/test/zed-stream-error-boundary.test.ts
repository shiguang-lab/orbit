import assert from "node:assert/strict";
import test from "node:test";
import { __test__ } from "../src/executors/zed-hosted.js";

function responseFor(...lines: unknown[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      controller.close();
    },
  }), { status: 200 });
}

async function drain(response: Response): Promise<{ output: string; error: unknown }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let output = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) return { output, error: null };
      output += decoder.decode(next.value, { stream: true });
    }
  } catch (error) {
    return { output, error };
  }
}

test("Zed pre-content failed status is an error frame without false completion", async () => {
  const response = __test__.wrapZedCompletionStream(
    responseFor({ status: { failed: { message: "account rejected" } } }),
    "x_ai" as never,
    "grok-test",
  );
  const { output, error } = await drain(response);
  assert.equal(error, null);
  assert.match(output, /ZED_STREAM_FAILED/);
  assert.match(output, /account rejected/);
  assert.doesNotMatch(output, /finish_reason.*stop|\[DONE\]/);
});

test("Zed mid-stream failure preserves output and rejects instead of stopping", async () => {
  const response = __test__.wrapZedCompletionStream(
    responseFor(
      { event: { choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }] } },
      { event: { choices: [{ index: 0, delta: { content: "partial" }, finish_reason: null }] } },
      { status: { failed: { message: "private upstream detail" } } },
    ),
    "x_ai" as never,
    "grok-test",
  );
  const { output, error } = await drain(response);
  assert.match(output, /partial/);
  assert.match(String(error), /Zed upstream stream failed/);
  assert.doesNotMatch(output, /private upstream detail|finish_reason.*stop|\[DONE\]/);
});
