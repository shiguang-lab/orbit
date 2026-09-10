import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { VIDEO_PROVIDERS } from "../src/config/videoRegistry.ts";
import { resolveVideoEndpoint } from "../src/handlers/videoGeneration/openai.ts";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function branchFormats(): Set<string> {
  const source = fs.readFileSync(
    path.join(packageRoot, "src/handlers/videoGeneration.ts"),
    "utf8"
  );
  return new Set(
    [...source.matchAll(/providerConfig\.format === "([a-z0-9-]+)"/g)].map(
      (match) => match[1]
    )
  );
}

function jobPresetFormats(): Set<string> {
  const source = fs.readFileSync(
    path.join(packageRoot, "src/handlers/videoGeneration/job.ts"),
    "utf8"
  );
  const block = source.slice(source.indexOf("VIDEO_JOB_PRESETS"));
  return new Set([...block.matchAll(/^  "([a-z0-9-]+)": \{/gm)].map((match) => match[1]));
}

test("every advertised video provider has a dispatcher transport", () => {
  const dispatchable = new Set([...branchFormats(), ...jobPresetFormats()]);
  const broken = Object.entries(VIDEO_PROVIDERS)
    .filter(([, config]) => !config.unsupported)
    .filter(([, config]) => !dispatchable.has(config.format))
    .map(([id, config]) => `${id}:${config.format}`);
  assert.deepEqual(broken, []);
});

test("every de-listed video provider explains why", () => {
  const silent = Object.entries(VIDEO_PROVIDERS)
    .filter(([, config]) => config.unsupported)
    .filter(([, config]) => !config.unsupportedReason?.trim())
    .map(([id]) => id);
  assert.deepEqual(silent, []);
});

test("OpenAI video endpoint uses registry fallback or a configured node base URL", () => {
  const fallback = "https://nano-gpt.com/api/v1/video/generations";
  assert.equal(resolveVideoEndpoint({ apiKey: "key" }, fallback), fallback);
  assert.equal(
    resolveVideoEndpoint({ baseUrl: "https://node.test/v1/" }, fallback),
    "https://node.test/v1/videos/generations"
  );
  assert.equal(
    resolveVideoEndpoint({ baseUrl: "https://node.test/v1/videos/generations" }, fallback),
    "https://node.test/v1/videos/generations"
  );
});
