import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("runtime tsconfig respects the OAuth package export over its same-named directory", () => {
  const output = execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const target = import.meta.resolve('@orbit/inference/oauth/providers');
    const providers = await import('@orbit/inference/oauth/providers');
    console.log(JSON.stringify({ target, exchangeTokens: typeof providers.exchangeTokens }));
  `], {
    cwd: fileURLToPath(new URL("../../../apps/control-api", import.meta.url)),
    env: { ...process.env, TSX_TSCONFIG_PATH: fileURLToPath(new URL("../tsconfig.json", import.meta.url)) },
    encoding: "utf8",
  });
  const result = JSON.parse(output.trim());
  assert.ok(result.target.endsWith("/oauth/providers.ts"));
  assert.equal(result.exchangeTokens, "function");
});
