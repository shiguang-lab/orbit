import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-server-owned-tool-loop-"));
process.env.DATA_DIR = dataDir;
process.env.API_KEY_SECRET = "server-owned-tool-loop-test";

const { runServerOwnedToolLoop, aggregateToolLoopUsage, MAX_FOLLOW_UPS } = await import(
  "../src/lib/skills/serverOwnedToolLoop.ts"
);
const { shouldRunServerOwnedToolLoop, isServerOwnedToolLoopEnabled } = await import(
  "../src/lib/skills/serverOwnedToolLoopGate.ts"
);
const { serializeBoundedToolResult, buildFollowUpSourceBody } = await import(
  "../src/lib/skills/followUpTranscript.ts"
);

test.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

const context = {
  apiKeyId: "local",
  sessionId: "session-1",
  requestId: "request-1",
  builtinToolNames: ["file_read"],
};

function openAiToolResponse(name: string, id = "call_1") {
  return {
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{ id, type: "function", function: { name, arguments: "{}" } }],
        },
        finish_reason: "tool_calls",
      },
    ],
  };
}

function openAiFinalResponse(text: string) {
  return {
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
  };
}

const baseOptions = {
  sourceBody: { model: "gpt-test", messages: [{ role: "user", content: "hi" }] },
  sourceFormat: "openai" as const,
  executionContext: context,
  deadlineAtMs: Date.now() + 60_000,
  initialConnectionId: "conn-1",
};

test("gate only enables non-streaming openai/claude turns", () => {
  assert.equal(
    shouldRunServerOwnedToolLoop({ enabled: true, stream: false, isResponsesEndpoint: false, sourceFormat: "openai" }),
    true
  );
  assert.equal(
    shouldRunServerOwnedToolLoop({ enabled: true, stream: false, isResponsesEndpoint: false, sourceFormat: "claude" }),
    true
  );
  assert.equal(
    shouldRunServerOwnedToolLoop({ enabled: true, stream: true, isResponsesEndpoint: false, sourceFormat: "openai" }),
    false
  );
  assert.equal(
    shouldRunServerOwnedToolLoop({ enabled: true, stream: false, isResponsesEndpoint: true, sourceFormat: "openai" }),
    false
  );
  assert.equal(
    shouldRunServerOwnedToolLoop({ enabled: false, stream: false, isResponsesEndpoint: false, sourceFormat: "openai" }),
    false
  );
  assert.equal(
    shouldRunServerOwnedToolLoop({ enabled: true, stream: false, isResponsesEndpoint: false, sourceFormat: "gemini" }),
    false
  );
});

test("runtime flag reads the ORBIT_SERVER_OWNED_TOOL_LOOP_ENABLED variable", () => {
  delete process.env.ORBIT_SERVER_OWNED_TOOL_LOOP_ENABLED;
  assert.equal(isServerOwnedToolLoopEnabled(), false);
  process.env.ORBIT_SERVER_OWNED_TOOL_LOOP_ENABLED = "true";
  assert.equal(isServerOwnedToolLoopEnabled(), true);
  process.env.ORBIT_SERVER_OWNED_TOOL_LOOP_ENABLED = "0";
  assert.equal(isServerOwnedToolLoopEnabled(), false);
  delete process.env.ORBIT_SERVER_OWNED_TOOL_LOOP_ENABLED;
});

test("follow-up resumes the same connection and returns the final answer", async () => {
  let followUps = 0;
  const result = await runServerOwnedToolLoop({
    ...baseOptions,
    initialResponse: openAiToolResponse("file_read"),
    executeServerOwned: async () => [{ id: "call_1", name: "file_read", result: { content: "data" } }],
    resumeUpstream: async (nextBody) => {
      followUps += 1;
      const messages = nextBody.messages as Record<string, unknown>[];
      assert.equal(messages.at(-1)?.role, "tool");
      return { kind: "ok", response: openAiFinalResponse("done"), connectionId: "conn-1", usage: { prompt_tokens: 5, completion_tokens: 2 } };
    },
  });
  assert.equal(result.kind, "ok");
  assert.equal(result.termination, "completed");
  assert.equal(result.followUps, 1);
  assert.equal(followUps, 1);
  assert.equal((result.response as any).choices[0].message.content, "done");
  assert.deepEqual(result.cumulativeUsage, { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 });
});

test("mixed client-native tools take the escape hatch instead of resuming", async () => {
  let resumed = false;
  const response = {
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "hold on",
          tool_calls: [
            { id: "call_1", type: "function", function: { name: "file_read", arguments: "{}" } },
            { id: "call_2", type: "function", function: { name: "Bash", arguments: "{}" } },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
  };
  const result = await runServerOwnedToolLoop({
    ...baseOptions,
    initialResponse: response,
    executeServerOwned: async () => [{ id: "call_1", name: "file_read", result: { ok: true } }],
    resumeUpstream: async () => {
      resumed = true;
      return { kind: "ok", response: openAiFinalResponse("unexpected"), connectionId: "conn-1" };
    },
  });
  assert.equal(resumed, false);
  assert.equal(result.termination, "mixed_tools");
  const message = (result.response as any).choices[0].message;
  assert.match(message.content, /file_read result/);
  assert.deepEqual(message.tool_calls.map((call: any) => call.id), ["call_2"]);
  assert.equal((result.response as any).choices[0].finish_reason, "tool_calls");
});

test("stops at the follow-up cap and marks remaining server-owned calls inline", async () => {
  let executions = 0;
  const result = await runServerOwnedToolLoop({
    ...baseOptions,
    initialResponse: openAiToolResponse("file_read"),
    executeServerOwned: async () => {
      executions += 1;
      return [{ id: "call_1", name: "file_read", result: { content: "data" } }];
    },
    resumeUpstream: async () => ({ kind: "ok", response: openAiToolResponse("file_read"), connectionId: "conn-1" }),
  });
  assert.equal(result.termination, "max_followups");
  assert.equal(result.followUps, MAX_FOLLOW_UPS);
  assert.equal(executions, MAX_FOLLOW_UPS + 1);
  const message = (result.response as any).choices[0].message;
  assert.match(message.content, /file_read result/);
  assert.equal(message.tool_calls, undefined);
  assert.equal((result.response as any).choices[0].finish_reason, "stop");
});

test("oversized tool output stops the loop with a bounded, escaped response", async () => {
  const result = await runServerOwnedToolLoop({
    ...baseOptions,
    initialResponse: openAiToolResponse("file_read"),
    executeServerOwned: async () => [
      { id: "call_1", name: "file_read", result: { content: "x".repeat(40_000) } },
    ],
    resumeUpstream: async () => ({ kind: "ok", response: openAiFinalResponse("unexpected"), connectionId: "conn-1" }),
  });
  assert.equal(result.termination, "tool_output_budget");
  assert.equal(result.followUps, 0);
  const content = (result.response as any).choices[0].message.content as string;
  assert.match(content, /TRUNCATED/);
});

test("a follow-up landing on another connection fails closed", async () => {
  const result = await runServerOwnedToolLoop({
    ...baseOptions,
    initialResponse: openAiToolResponse("file_read"),
    executeServerOwned: async () => [{ id: "call_1", name: "file_read", result: {} }],
    resumeUpstream: async () => ({ kind: "ok", response: openAiFinalResponse("done"), connectionId: "conn-2" }),
  });
  assert.equal(result.kind, "error");
  assert.equal(result.termination, "connection_mismatch");
  assert.equal(result.error?.status, 409);
});

test("a failing follow-up surfaces the provider error and accumulated usage", async () => {
  const result = await runServerOwnedToolLoop({
    ...baseOptions,
    initialResponse: openAiToolResponse("file_read"),
    executeServerOwned: async () => [{ id: "call_1", name: "file_read", result: {} }],
    resumeUpstream: async () => ({ kind: "error", message: "upstream 500", status: 502, usage: { prompt_tokens: 3, completion_tokens: 0 } }),
  });
  assert.equal(result.kind, "error");
  assert.equal(result.termination, "provider_error");
  assert.equal(result.error?.message, "upstream 500");
  assert.deepEqual(result.cumulativeUsage, { prompt_tokens: 3, completion_tokens: 0, total_tokens: 3 });
});

test("server-owned calls with no tool calls complete immediately", async () => {
  const result = await runServerOwnedToolLoop({
    ...baseOptions,
    initialResponse: openAiFinalResponse("plain answer"),
    executeServerOwned: async () => {
      throw new Error("should not execute");
    },
    resumeUpstream: async () => {
      throw new Error("should not resume");
    },
  });
  assert.equal(result.termination, "completed");
  assert.equal(result.followUps, 0);
});

test("native-only tool calls are reported as client_tools without execution", async () => {
  const result = await runServerOwnedToolLoop({
    ...baseOptions,
    initialResponse: openAiToolResponse("Bash", "call_native"),
    executeServerOwned: async () => {
      throw new Error("should not execute");
    },
    resumeUpstream: async () => {
      throw new Error("should not resume");
    },
  });
  assert.equal(result.termination, "client_tools");
  assert.equal(result.kind, "ok");
});

test("usage aggregation sums legs and recomputes totals", () => {
  assert.deepEqual(aggregateToolLoopUsage([null, null]), null);
  assert.deepEqual(
    aggregateToolLoopUsage([
      { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      { prompt_tokens: 2, completion_tokens: 1 },
      null,
    ]),
    { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 }
  );
});

test("bounded serialization truncates on a UTF-8 code point boundary", () => {
  const value = { text: "汉字".repeat(100) };
  const bounded = serializeBoundedToolResult(value, 64);
  assert.equal(bounded.truncated, true);
  assert.equal(bounded.text.includes("\uFFFD"), false);
  assert.ok(Buffer.byteLength(bounded.text, "utf8") <= 64);
  assert.match(bounded.text, /TRUNCATED/);
});

test("transcript builder rejects mismatched tool call/result pairs", () => {
  assert.throws(
    () =>
      buildFollowUpSourceBody({
        sourceBody: { messages: [] },
        previousResponse: {},
        toolCalls: [{ id: "a", name: "file_read", arguments: {} }],
        results: [{ id: "b", name: "file_read", result: {} }],
        sourceFormat: "openai",
      }),
    /missing tool call for result b/
  );
});

test("claude transcript uses tool_use / tool_result blocks", () => {
  const body = buildFollowUpSourceBody({
    sourceBody: { model: "claude-test", messages: [{ role: "user", content: "hi" }] },
    previousResponse: {
      content: [{ type: "tool_use", id: "toolu_1", name: "file_read", input: { path: "a" } }],
    },
    toolCalls: [{ id: "toolu_1", name: "file_read", arguments: { path: "a" } }],
    results: [{ id: "toolu_1", name: "file_read", result: { content: "data" } }],
    sourceFormat: "claude",
  });
  const messages = body.messages as Record<string, unknown>[];
  assert.equal(messages.at(-2)?.role, "assistant");
  assert.equal(messages.at(-1)?.role, "user");
  const resultBlocks = messages.at(-1)?.content as Record<string, unknown>[];
  assert.equal(resultBlocks[0]?.type, "tool_result");
  assert.equal(resultBlocks[0]?.tool_use_id, "toolu_1");
});
