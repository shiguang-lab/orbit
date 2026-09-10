import assert from "node:assert/strict";
import test from "node:test";

import { catalogContainsModel } from "@orbit/core/db/active-synced-catalog";
import {
  githubComboCatalogGate,
  resolveComboCheckProvider,
} from "../src/handlers/chat/githubLiveCatalogFilter.ts";
import { parseGitHubCopilotModels } from "../src/services/githubCopilotModels.ts";

const liveCatalog = {
  authoritative: true,
  models: [{ id: "claude-sonnet-5", name: "Claude Sonnet 5", source: "imported" as const }],
};

test("authoritative catalog accepts bare/prefixed live ids and rejects missing ids", () => {
  assert.equal(catalogContainsModel(liveCatalog, "claude-sonnet-5"), true);
  assert.equal(catalogContainsModel(liveCatalog, "github/claude-sonnet-5"), true);
  assert.equal(catalogContainsModel(liveCatalog, "github/claude-fable-5"), false);
  assert.equal(catalogContainsModel({ ...liveCatalog, authoritative: false }, "missing"), null);
});

test("GitHub combo gate fails open before sync and memoizes catalog load per request", async () => {
  let loads = 0;
  const loader = async () => {
    loads += 1;
    return liveCatalog;
  };
  const scope = {};
  assert.equal(await githubComboCatalogGate(scope, "github", "missing", loader), false);
  assert.equal(await githubComboCatalogGate(scope, "github", "claude-sonnet-5", loader), null);
  assert.equal(loads, 1);
  assert.equal(
    await githubComboCatalogGate({}, "gh", "missing", async () => ({
      authoritative: false,
      models: [],
    })),
    null
  );
  assert.equal(await githubComboCatalogGate({}, "openai", "missing", loader), null);
});

test("combo provider resolution preserves explicit cross-provider targets", () => {
  assert.equal(resolveComboCheckProvider("gh/model", { provider: "github" }, "gh"), "github");
  assert.equal(resolveComboCheckProvider("xiaomi/model", { provider: "xiaomi" }, "opengate"), "opengate");
});

test("GitHub discovery drops policy-disabled and picker-hidden chat models", () => {
  const models = parseGitHubCopilotModels({
    data: [
      { id: "enabled", policy: { state: "enabled" }, capabilities: { type: "chat" } },
      { id: "disabled", policy: { state: "disabled" }, capabilities: { type: "chat" } },
      { id: "hidden", model_picker_enabled: false, capabilities: { type: "chat" } },
    ],
  });
  assert.deepEqual(models.map((model) => model.id), ["enabled"]);
});
