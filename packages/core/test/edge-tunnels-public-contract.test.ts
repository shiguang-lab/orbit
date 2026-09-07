import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types?: string; import?: string } | string>;
};

const expectedRuntimeKeys = [
  "disableTailscaleTunnel",
  "enableTailscaleTunnel",
  "getCloudflaredTunnelStatus",
  "getNgrokTunnelStatus",
  "getTailscaleCheckStatus",
  "getTailscaleTunnelStatus",
  "installTailscale",
  "startCloudflaredTunnel",
  "startNgrokTunnel",
  "startTailscaleDaemon",
  "startTailscaleLogin",
  "stopCloudflaredTunnel",
  "stopNgrokTunnel",
] as const;

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", ".turbo"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

test("edge/tunnels exposes only the tunnel command operations consumed by gateway", async () => {
  const entry = manifest.exports["./edge/tunnels"];
  assert.deepEqual(entry, {
    types: "./src/public/edgeTunnels.d.ts",
    import: "./src/edge/tunnels.ts",
  });

  const runtime = await import(
    pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href,
  );
  assert.deepEqual(Object.keys(runtime).sort(), [...expectedRuntimeKeys].sort());

  const declaration = fs.readFileSync(
    path.join(packageRoot, (entry as { types: string }).types),
    "utf8",
  );
  const declaredFunctions = [...declaration.matchAll(/export declare function (\w+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(declaredFunctions.sort(), [...expectedRuntimeKeys].sort());
  assert.doesNotMatch(declaration, /export\s+(?:interface|type)\s+/);
});

test("wide tunnel implementation targets and helpers stay private", () => {
  const wrapper = fs.readFileSync(path.join(packageRoot, "src/edge/tunnels.ts"), "utf8");
  assert.doesNotMatch(wrapper, /export\s+\*/);
  assert.doesNotMatch(
    wrapper,
    /\b(?:startTailscaleFunnel|stopTailscaleFunnel|stopTailscaleDaemon|tailscaleUpArgs|extract\w+|build\w+)\b/,
  );

  const retiredTargets = new Set([
    "./src/lib/cloudflaredTunnel.ts",
    "./src/lib/ngrokTunnel.ts",
    "./src/lib/tailscaleTunnel.ts",
  ]);
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    const runtimeTarget = typeof target === "string" ? target : target.import;
    assert.equal(retiredTargets.has(runtimeTarget ?? ""), false, subpath);
  }

  const consumers = sourceFiles(path.join(repoRoot, "apps"))
    .filter((file) => fs.readFileSync(file, "utf8").includes("@orbit/core/edge/tunnels"))
    .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"));
  assert.deepEqual(consumers, ["apps/gateway/src/tunnels/tunnels.service.ts"]);
});
