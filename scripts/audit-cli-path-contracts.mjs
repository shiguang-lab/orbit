#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");
const targets = [
  "apps/cli/src/shiguang-gateway.mjs",
  "apps/cli/src/mcp-server.mjs",
  "apps/cli/src/cli/program.mjs",
  "apps/cli/src/cli/commands/update.mjs",
  "apps/cli/src/cli/commands/setup.mjs",
  "apps/cli/src/cli/commands/config.mjs",
  "apps/cli/src/cli/commands/status.mjs",
  "apps/cli/src/cli/tray/autostart.mjs",
  "apps/cli/src/cli/scripts/generate-locales.mjs",
];
const source = targets.map((file) => `${file}\n${read(file)}`).join("\n");

assert.doesNotMatch(source, /packages\/core-domain\/bin|config\/i18n\.json/);
assert.doesNotMatch(source, /npm install -g shiguangGateway|update --apply|update-notifier/);
assert.doesNotMatch(source, /@shiguangGateway[\\/]opencode-plugin|BUNDLED_PLUGIN_DIR/);
assert.match(read("apps/cli/src/mcp-server.mjs"), /@shiguang-gateway\/open-sse\/mcp-server\/factory/);
assert.doesNotMatch(read("apps/cli/src/mcp-server.mjs"), /mcp-server\/entry/);

const cliPackage = JSON.parse(read("apps/cli/package.json"));
assert.equal(cliPackage.private, true);
assert.equal(cliPackage.dependencies?.["update-notifier"], undefined);

console.log("cli path contracts audit: PASS");
