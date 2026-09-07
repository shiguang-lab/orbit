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

test("compose enables the realtime listener targeted by the console proxy", (context) => {
  const available = spawnSync("docker", ["compose", "version"], { encoding: "utf8" });
  if (available.status !== 0) return context.skip("Docker Compose is required for rendered configuration validation");
  const result = spawnSync("docker", ["compose", "-f", join(repoRoot, "docker-compose.yml"),
    "config", "--no-interpolate", "--format", "json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const services = JSON.parse(result.stdout).services;
  const realtime = services["orbit-realtime"].environment;
  assert.equal(realtime.ORBIT_ENABLE_LIVE_WS, "true");
  assert.equal(realtime.LIVE_WS_HOST, "0.0.0.0");
  const nginx = readFileSync(join(repoRoot, "deploy/console-nginx.conf"), "utf8");
  assert.ok(nginx.includes(`proxy_pass http://orbit-realtime:${realtime.LIVE_WS_PORT};`));
  for (const service of ["gateway", "control", "worker"]) {
    assert.equal(services[`orbit-${service}`].environment.ORBIT_ENABLE_LIVE_WS, "false");
    assert.equal(services[`orbit-${service}`].environment.CLI_QODER_BIN, "${CLI_QODER_BIN:-qodercli}");
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

test("published image repositories use the Orbit namespace", () => {
  const workflow = readFileSync(join(repoRoot, ".github", "workflows", "docker-publish.yml"), "utf8");
  const compose = readFileSync(join(repoRoot, "docker-compose.yml"), "utf8");
  const rollback = readFileSync(join(opsDir, "rollback.sh"), "utf8");
  assert.match(workflow, /IMAGE_PREFIX: ghcr\.io\/shiguang-lab\/orbit\b/);
  const retiredImagePrefix = ["shiguang", "gateway"].join("-");
  assert.ok(!`${workflow}\n${compose}\n${rollback}`.includes(`ghcr.io/shiguang-lab/${retiredImagePrefix}`));
  for (const service of ["console", "gateway", "control", "realtime", "worker", "importer"]) {
    assert.match(compose, new RegExp(`orbit-${service}:local`));
  }
});

test("rollback applies one split image family and does not start the importer", () => {
  const fixture = mkdtempSync(join(tmpdir(), "orbit-ops-"));
  try {
    const fakeBin = join(fixture, "bin");
    const log = join(fixture, "docker.log");
    const docker = join(fakeBin, "docker");
    spawnSync("mkdir", ["-p", fakeBin]);
    writeFileSync(
      docker,
      `#!/usr/bin/env bash\n` +
        `printf '%s\\n' "CONSOLE=$ORBIT_CONSOLE_IMAGE" "GATEWAY=$ORBIT_GATEWAY_IMAGE" "CONTROL=$ORBIT_CONTROL_IMAGE" "REALTIME=$ORBIT_REALTIME_IMAGE" "WORKER=$ORBIT_WORKER_IMAGE" "IMPORTER=$ORBIT_IMPORTER_IMAGE" "ARGS=$*" >> "${log}"\n`
    );
    chmodSync(docker, 0o755);
    const result = spawnSync(
      "bash",
      [join(opsDir, "rollback.sh"), "v3.8.50", "--compose-file", join(repoRoot, "docker-compose.yml"), "--yes"],
      { encoding: "utf8", env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` } }
    );
    assert.equal(result.status, 0, result.stderr);
    const output = readFileSync(log, "utf8");
    for (const service of ["console", "gateway", "control", "realtime", "worker", "importer"]) {
      assert.match(output, new RegExp(`ghcr\\.io/shiguang-lab/orbit-${service}:v3\\.8\\.50`));
    }
    assert.match(output, /ARGS=compose .* --profile migration pull/);
    assert.match(output, /ARGS=compose .* up -d --no-build/);
    assert.doesNotMatch(output, /ARGS=.*up.*importer/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
