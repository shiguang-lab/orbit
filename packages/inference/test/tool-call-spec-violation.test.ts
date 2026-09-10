import assert from "node:assert/strict";
import test from "node:test";

import { findToolCallSpecViolation } from "../src/services/combo/validateQuality.ts";

function bodyWithToolCalls(toolCalls: unknown) {
  return { choices: [{ message: { tool_calls: toolCalls } }] };
}

test("findToolCallSpecViolation flags byte-identical duplicate tool_calls", () => {
  const violation = findToolCallSpecViolation(
    bodyWithToolCalls([
      { function: { name: "heartbeat_respond", arguments: "{}" } },
      { function: { name: "heartbeat_respond", arguments: "{}" } },
    ])
  );
  assert.equal(violation, 'duplicate tool_calls entry for "heartbeat_respond"');
});

test("findToolCallSpecViolation allows distinct names or arguments", () => {
  assert.equal(
    findToolCallSpecViolation(
      bodyWithToolCalls([
        { function: { name: "heartbeat_respond", arguments: "{}" } },
        { function: { name: "other_tool", arguments: "{}" } },
      ])
    ),
    null
  );
  assert.equal(
    findToolCallSpecViolation(
      bodyWithToolCalls([
        { function: { name: "heartbeat_respond", arguments: '{"a":1}' } },
        { function: { name: "heartbeat_respond", arguments: '{"a":2}' } },
      ])
    ),
    null
  );
});

test("findToolCallSpecViolation ignores non-chat shapes and single tool calls", () => {
  assert.equal(findToolCallSpecViolation(null), null);
  assert.equal(findToolCallSpecViolation({}), null);
  assert.equal(findToolCallSpecViolation({ choices: [] }), null);
  assert.equal(
    findToolCallSpecViolation(
      bodyWithToolCalls([{ function: { name: "heartbeat_respond", arguments: "{}" } }])
    ),
    null
  );
  assert.equal(
    findToolCallSpecViolation(bodyWithToolCalls([{ function: { name: "x" } }, "junk"])),
    null
  );
});
