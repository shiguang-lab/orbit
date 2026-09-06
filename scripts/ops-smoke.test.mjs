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
