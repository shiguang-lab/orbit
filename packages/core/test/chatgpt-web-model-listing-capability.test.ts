import assert from "node:assert/strict";
import test from "node:test";

import { providerUsesCuratedModelsOnly } from "../src/lib/providers/modelListingCapability.ts";

test("clean-room ChatGPT Web uses its observed curated model catalog", () => {
  assert.equal(providerUsesCuratedModelsOnly("chatgpt-web"), true);
  assert.equal(providerUsesCuratedModelsOnly(" ChatGPT-Web "), true);
  assert.equal(providerUsesCuratedModelsOnly("cgpt-web"), false);
  assert.equal(providerUsesCuratedModelsOnly("chatgpt-web-codex"), false);
});
