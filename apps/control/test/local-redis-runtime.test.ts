import assert from "node:assert/strict";
import test from "node:test";
import {
  REDIS_CONTAINER_NAME,
  buildRedisPublishSpec,
  buildRedisRunArgs,
  detectRedisContainerRuntime,
  parseRedisUrl,
  runRedisRuntimeCommand,
} from "../src/local-redis/local-redis-runtime.js";

test("keeps Redis bound to loopback by default and formats IPv6 safely", () => {
  assert.equal(buildRedisPublishSpec(), "127.0.0.1:6379:6379");
  assert.equal(buildRedisPublishSpec("::1", 6380), "[::1]:6380:6379");
});

test("builds the unchanged Docker/Podman run argv", () => {
  assert.deepEqual(buildRedisRunArgs({
    bindHost: "127.0.0.1",
    hostPort: "6380",
    image: "docker.io/redis:7-alpine",
  }), [
    "run", "-d", "--name", REDIS_CONTAINER_NAME,
    "-p", "127.0.0.1:6380:6379",
    "--restart", "unless-stopped", "docker.io/redis:7-alpine",
  ]);
});

test("prefers Podman, falls back to Docker, and preserves probe timeout", async () => {
  const calls: Array<{ file: string; args: readonly string[]; timeout: number }> = [];
  const runtime = await detectRedisContainerRuntime(async (file, args, options) => {
    calls.push({ file, args, timeout: options.timeout });
    if (file === "podman") throw new Error("missing");
    return { stdout: "Docker", stderr: "" };
  });
  assert.equal(runtime, "docker");
  assert.deepEqual(calls, [
    { file: "podman", args: ["--version"], timeout: 3000 },
    { file: "docker", args: ["--version"], timeout: 3000 },
  ]);
});

test("passes argv and caller timeout without a shell and preserves trimmed result shape", async () => {
  const result = await runRedisRuntimeCommand(
    "docker",
    ["stop", REDIS_CONTAINER_NAME],
    15_000,
    async (file, args, options) => {
      assert.equal(file, "docker");
      assert.deepEqual(args, ["stop", REDIS_CONTAINER_NAME]);
      assert.deepEqual(options, { timeout: 15_000 });
      return { stdout: " stopped \n", stderr: " warning \n" };
    },
  );
  assert.deepEqual(result, { stdout: "stopped", stderr: "warning" });
});

test("parses configured Redis endpoints with the existing defaults", () => {
  assert.deepEqual(parseRedisUrl("redis://cache.internal"), { host: "cache.internal", port: 6379 });
  assert.deepEqual(parseRedisUrl("redis://127.0.0.1:6380"), { host: "127.0.0.1", port: 6380 });
  assert.equal(parseRedisUrl("not a url"), null);
});
