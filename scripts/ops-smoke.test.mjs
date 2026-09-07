import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const repoRoot = resolve(import.meta.dirname, "..");
const opsDir = join(repoRoot, "scripts", "ops");
const commands = [
  "cold-start-bench.sh",
  "restore-data.sh",
  "restore-policies.sh",
  "rollback.sh",
  "snapshot-data.sh",
];

test("compose enables the realtime listener targeted by the admin proxy", (context) => {
  const available = spawnSync("docker", ["compose", "version"], { encoding: "utf8" });
  if (available.status !== 0) return context.skip("Docker Compose is required for rendered configuration validation");
  const result = spawnSync("docker", ["compose", "-f", join(repoRoot, "docker-compose.yml"),
    "config", "--no-interpolate", "--format", "json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const services = JSON.parse(result.stdout).services;
  const realtime = services["shiguang-gateway-realtime"].environment;
  assert.equal(realtime.SHIGUANG_GATEWAY_ENABLE_LIVE_WS, "true");
  assert.equal(realtime.LIVE_WS_HOST, "0.0.0.0");
  const nginx = readFileSync(join(repoRoot, "deploy/admin-nginx.conf"), "utf8");
  assert.ok(nginx.includes(`proxy_pass http://shiguang-gateway-realtime:${realtime.LIVE_WS_PORT};`));
  for (const service of ["edge", "control", "worker"]) {
    assert.equal(services[`shiguang-gateway-${service}`].environment.SHIGUANG_GATEWAY_ENABLE_LIVE_WS, "false");
    assert.equal(services[`shiguang-gateway-${service}`].environment.CLI_QODER_BIN, "${CLI_QODER_BIN:-qodercli}");
  }
});

test("ops scripts have valid Bash syntax and current usage paths", () => {
  for (const name of commands) {
    const path = join(opsDir, name);
    const syntax = spawnSync("bash", ["-n", path], { encoding: "utf8" });
    assert.equal(syntax.status, 0, `${name}: ${syntax.stderr}`);
    const help = spawnSync("bash", [path, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0, `${name}: ${help.stderr}`);
    assert.match(help.stdout, new RegExp(`scripts/ops/${name.replace(".", "\\.")}`));
    assert.doesNotMatch(help.stdout, /Usage: bin\//);
  }
});

test("rollback applies one split image family and does not start the importer", () => {
  const fixture = mkdtempSync(join(tmpdir(), "shiguang-ops-"));
  try {
    const fakeBin = join(fixture, "bin");
    const log = join(fixture, "docker.log");
    const docker = join(fakeBin, "docker");
    spawnSync("mkdir", ["-p", fakeBin]);
    writeFileSync(
      docker,
      `#!/usr/bin/env bash\n` +
        `printf '%s\\n' "ADMIN=$SHIGUANG_GATEWAY_ADMIN_IMAGE" "EDGE=$SHIGUANG_GATEWAY_EDGE_IMAGE" "CONTROL=$SHIGUANG_GATEWAY_CONTROL_IMAGE" "REALTIME=$SHIGUANG_GATEWAY_REALTIME_IMAGE" "WORKER=$SHIGUANG_GATEWAY_WORKER_IMAGE" "IMPORTER=$SHIGUANG_GATEWAY_IMPORTER_IMAGE" "ARGS=$*" >> "${log}"\n`
    );
    chmodSync(docker, 0o755);
    const result = spawnSync(
      "bash",
      [join(opsDir, "rollback.sh"), "v3.8.50", "--compose-file", join(repoRoot, "docker-compose.yml"), "--yes"],
      { encoding: "utf8", env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` } }
    );
    assert.equal(result.status, 0, result.stderr);
    const output = readFileSync(log, "utf8");
    for (const service of ["admin", "edge", "control", "realtime", "worker", "importer"]) {
      assert.match(output, new RegExp(`-${service}:v3\\.8\\.50`));
    }
    assert.match(output, /ARGS=compose .* --profile migration pull/);
    assert.match(output, /ARGS=compose .* up -d --no-build/);
    assert.doesNotMatch(output, /ARGS=.*up.*importer/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
