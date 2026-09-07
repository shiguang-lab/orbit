import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  CLI_APP_ROOT,
  CLI_ENTRY,
  CLI_LOCALES_DIR,
  CLI_PACKAGE_JSON,
  readCliVersion,
} from "../src/cli/app-paths.mjs";
import { generateLocales } from "../src/cli/scripts/generate-locales.mjs";
import { buildServeExecLine, resolveCliPath } from "../src/cli/tray/autostart.mjs";
import { getCurrentVersion, runUpdateCommand } from "../src/cli/commands/update.mjs";

test("CLI-owned paths and version do not depend on cwd", async () => {
  const previous = process.cwd();
  const elsewhere = mkdtempSync(join(tmpdir(), "shiguang-cli-cwd-"));
  try {
    process.chdir(elsewhere);
    const manifest = JSON.parse(readFileSync(CLI_PACKAGE_JSON, "utf8"));
    assert.equal(readCliVersion(), manifest.version);
    assert.equal(await getCurrentVersion(), manifest.version);
    assert.equal(CLI_ENTRY, join(CLI_APP_ROOT, "src", "shiguang-gateway.mjs"));
    assert.equal(CLI_LOCALES_DIR, join(CLI_APP_ROOT, "src", "cli", "locales"));
  } finally {
    process.chdir(previous);
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("update remains a read-only workspace check", async () => {
  assert.equal(await runUpdateCommand({ apply: true }), 0);
});

test("MCP launcher consumes the callable open-sse factory", () => {
  const source = readFileSync(join(CLI_APP_ROOT, "src", "mcp-server.mjs"), "utf8");
  assert.match(source, /@orbit\/inference\/mcp-server\/factory/);
  assert.doesNotMatch(source, /mcp-server\/entry/);
});

test("autostart always targets the app-owned CLI entry", () => {
  assert.equal(resolveCliPath(), CLI_ENTRY);
  assert.equal(resolveCliPath({ existsSync: () => false, realpathSync: (path) => path }), null);
  const line = buildServeExecLine("/workspace with spaces/apps/cli/src/shiguang-gateway.mjs", {
    tray: true,
  });
  assert.match(line, /shiguang-gateway\.mjs" serve --no-open --tray$/);
});

test("locale generation uses the app catalog and an injected destination", () => {
  const directory = mkdtempSync(join(tmpdir(), "shiguang-cli-locales-"));
  try {
    const result = generateLocales({
      locales: [{ code: "zz", english: "Test" }],
      localesDir: directory,
      log() {},
    });
    assert.deepEqual(result, { created: 1, skipped: 0 });
    assert.equal(readFileSync(join(directory, "zz.json"), "utf8"), "{}\n");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI path audit passes", () => {
  const result = spawnSync(process.execPath, ["scripts/audit-cli-path-contracts.mjs"], {
    cwd: dirname(dirname(CLI_APP_ROOT)),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
