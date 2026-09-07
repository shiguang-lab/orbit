import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { solveDeepSeekPowAsync } from "../src/executors/deepseek/pow.ts";
import { deepSeekHashV1Reference } from "../src/executors/deepseek/pow-hash.js";

test("PoW worker resolves beside its module regardless of cwd and legacy files", async () => {
  const original = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "orbit-pow-"));
  try {
    await mkdir(join(directory, "open-sse/lib"), { recursive: true });
    await writeFile(join(directory, "open-sse/lib/deepseek-pow-worker.mjs"), 'throw new Error("legacy worker must not run");');
    process.chdir(directory);
    const challenge = deepSeekHashV1Reference("test_123_3");
    assert.equal(await solveDeepSeekPowAsync("DeepSeekHashV1", challenge, "test", 8, 123), 3);
    assert.equal(await solveDeepSeekPowAsync("DeepSeekHashV1", challenge, "test", 2, 123), -1);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(solveDeepSeekPowAsync("DeepSeekHashV1", challenge, "test", 8, 123,
      { signal: controller.signal }), { name: "AbortError" });
  } finally {
    process.chdir(original);
    await rm(directory, { recursive: true, force: true });
  }
});
