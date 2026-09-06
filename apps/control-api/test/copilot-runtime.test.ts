import assert from "node:assert/strict";
import test from "node:test";

import { classifyCommand } from "../src/copilot/runtime/command-classification.js";
import {
  isCodeGraphAvailable,
  searchSymbols,
  setCodeGraphPathForTest,
} from "../src/copilot/runtime/codegraph-knowledge.js";
import { processCopilotChat } from "../src/copilot/runtime/engine.js";

test("Copilot command classification fails closed", () => {
  assert.equal(classifyCommand(["health"])?.category, "read-only");
  assert.equal(classifyCommand(["config", "set", "port", "9000"])?.category, "mutating");
  assert.equal(classifyCommand(["delete", "key", "abc"])?.category, "destructive");
  assert.equal(classifyCommand(["do-something-unknown"]), null);
});

test("Copilot handles empty, help, and knowledge requests without external dispatch", async () => {
  assert.deepEqual(await processCopilotChat({ messages: [] }), { message: "No user message found." });
  assert.match(
    (await processCopilotChat({ messages: [{ role: "user", content: "help" }] })).message,
    /Comandos disponibles/,
  );
  assert.match(
    (await processCopilotChat({ messages: [{ role: "user", content: "Explain the architecture" }] })).message,
    /request pipeline/i,
  );
});

test("Copilot CodeGraph queries degrade cleanly without an index", () => {
  setCodeGraphPathForTest(null);
  assert.equal(isCodeGraphAvailable(), false);
  assert.deepEqual(searchSymbols("handler"), {
    success: false,
    data: null,
    error: "CodeGraph DB not found",
    engine: "none",
  });
  setCodeGraphPathForTest(undefined);
});
