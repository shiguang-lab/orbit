import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CLI_CAPABILITY_MANIFEST,
  assertCliCapabilityManifest,
} from "@orbit/contracts/cli-capabilities";
import { buildCliRegistry, parseCliRegistry } from "../src/lib/agentSkills/cliRegistryParser.js";

test("CLI capability manifest is valid and publishes every supported family", () => {
  assert.doesNotThrow(() => assertCliCapabilityManifest(CLI_CAPABILITY_MANIFEST));
  const registry = parseCliRegistry();

  assert.equal(registry.commands.size, CLI_CAPABILITY_MANIFEST.length);
  assert.equal(registry.families.size, 20);
  assert.ok(registry.commands.size > 300);
});

test("registry preserves full multi-level command paths", () => {
  const { commands } = parseCliRegistry();

  for (const name of [
    "backup auto enable",
    "context-eng rtk config set",
    "skills marketplace install <packageId>",
    "cloud codex task create",
  ]) {
    assert.equal(commands.get(name)?.name, name);
    assert.equal(commands.get(name)?.isSubcommand, true);
  }
  assert.equal(commands.has("backup enable"), false);
  assert.equal(commands.has("cloud task create"), false);
});

test("registry construction is stable across working directories", () => {
  const originalCwd = process.cwd();
  const emptyCwd = mkdtempSync(join(tmpdir(), "cli-capability-cwd-"));
  const expected = [...parseCliRegistry().commands.keys()];

  try {
    process.chdir(emptyCwd);
    assert.deepEqual([...parseCliRegistry().commands.keys()], expected);
  } finally {
    process.chdir(originalCwd);
    rmSync(emptyCwd, { recursive: true, force: true });
  }
});

test("invalid manifests fail instead of producing a partial registry", () => {
  assert.throws(() => buildCliRegistry([]), /non-empty array/);
  assert.throws(
    () =>
      buildCliRegistry([
        { path: ["health"], family: "cli-health", description: "", flags: [] },
        { path: ["health"], family: "cli-health", description: "duplicate", flags: [] },
      ]),
    /duplicate path: health/
  );
  assert.throws(
    () =>
      buildCliRegistry([
        { path: ["health"], family: "not-a-family", description: "", flags: [] },
      ]),
    /invalid family/
  );
});
