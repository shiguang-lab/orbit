import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("production images build the dashboard with the same unified login default as Compose", () => {
  const dockerfile = readFileSync(new URL("../../../Dockerfile", import.meta.url), "utf8");
  const compose = readFileSync(new URL("../../../docker-compose.yml", import.meta.url), "utf8");
  const turbo = JSON.parse(readFileSync(new URL("../../../turbo.json", import.meta.url), "utf8"));
  assert.match(dockerfile, /^ARG VITE_AUTH_MODE=shiguang$/m);
  assert.match(dockerfile, /^RUN VITE_AUTH_MODE="\$VITE_AUTH_MODE" pnpm build$/m);
  assert.match(compose, /SHIGUANG_GATEWAY_AUTH_MODE:-shiguang/);
  assert.ok(turbo.tasks.build.env.includes("VITE_AUTH_MODE"));
});
