import assert from "node:assert/strict";
import test from "node:test";
import { providerUsesAuthoritativeLiveCatalog } from "@orbit/providers/provider-registry";
import { claude } from "../src/oauth/providers/claude.js";
import { codex } from "../src/oauth/providers/codex.js";
import { github } from "../src/oauth/providers/github.js";

test("AGY account catalogs are authoritative", () => {
  assert.equal(providerUsesAuthoritativeLiveCatalog("agy"), true);
  assert.equal(providerUsesAuthoritativeLiveCatalog("antigravity"), true);
});

test("Claude, Codex and Copilot OAuth imports enable live catalog auto-sync", () => {
  const claudeTokens = claude.mapTokens({ access_token: "a" }, {});
  const codexTokens = codex.mapTokens({ access_token: "a" }, { authInfo: null });
  const githubTokens = github.mapTokens({ access_token: "a" }, {});
  assert.equal(claudeTokens.providerSpecificData.autoSync, true);
  assert.equal(codexTokens.providerSpecificData.autoSync, true);
  assert.equal(githubTokens.providerSpecificData.autoSync, true);
});
