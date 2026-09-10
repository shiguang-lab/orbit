import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUniversalHandoffSystemMessage,
  isCrossRequestHandoffAttempt,
} from "../src/services/contextHandoff.ts";

test("bare universal handoff warns against invented prior context", () => {
  const message = buildUniversalHandoffSystemMessage(
    "openai/previous",
    "anthropic/current",
    "model switch",
    null
  );
  assert.match(message, /No prior-session summary is available/);
  assert.match(message, /do not assume or invent/);
  assert.doesNotMatch(message, /continuar sin perder el hilo/);
});

test("universal handoff applies only to the first target of a request", () => {
  assert.equal(isCrossRequestHandoffAttempt(0), true);
  assert.equal(isCrossRequestHandoffAttempt(1), false);
  assert.equal(isCrossRequestHandoffAttempt(7), false);
});
