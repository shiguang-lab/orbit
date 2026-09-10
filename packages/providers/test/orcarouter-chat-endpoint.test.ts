import assert from "node:assert/strict";
import test from "node:test";

import { orcarouterProvider } from "../src/config/providers/registry/orcarouter/index.ts";

test("OrcaRouter registry targets the chat completions endpoint", () => {
  assert.equal(orcarouterProvider.baseUrl, "https://api.orcarouter.ai/v1/chat/completions");
});
