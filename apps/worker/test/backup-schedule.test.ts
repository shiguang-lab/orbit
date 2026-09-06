import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { readBackupSchedule, writeBackupSchedule } from "@shiguang-gateway/core-domain/backup/runtime";
import {
  runBackupScheduleTick,
  startBackupScheduleJob,
  stopBackupScheduleJob,
} from "../src/jobs/backup-schedule.ts";
import { WORKER_JOBS } from "../src/jobs/registry.ts";

test("worker registry owns backup scheduling and its teardown", () => {
  const job = WORKER_JOBS.find(({ name }) => name === "backup-schedule");
  assert.ok(job);
  const { loadModule, ...metadata } = job;
  assert.deepEqual(metadata, {
    name: "backup-schedule",
    mode: "call",
    exportName: "startBackupScheduleJob",
    stopExportName: "stopBackupScheduleJob",
  });
  assert.equal(typeof loadModule, "function");
});

test("backup scheduler start, stop, and restart are idempotent", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  t.after(() => {
    stopBackupScheduleJob();
    t.mock.timers.reset();
  });
  const first = startBackupScheduleJob();
  assert.equal(startBackupScheduleJob(), first);
  stopBackupScheduleJob();
  stopBackupScheduleJob();
  const restarted = startBackupScheduleJob();
  assert.notEqual(restarted, first);
});

test("worker backup schedule runs once per matching minute and records success", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-backup-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;
  t.after(() => {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(dataDir, "settings.json"), "{}");
  writeBackupSchedule({ enabled: true, cron: "* * * * *" }, dataDir);
  const now = new Date(2026, 0, 2, 3, 4, 5);

  assert.equal(await runBackupScheduleTick(now), true);
  assert.equal(await runBackupScheduleTick(new Date(2026, 0, 2, 3, 4, 40)), false);
  assert.equal(readBackupSchedule(dataDir)?.lastRunAt, now.toISOString());
  assert.equal(fs.readdirSync(path.join(dataDir, "backups")).length, 1);
});

test("worker refuses schedules requiring unavailable interactive or cloud adapters", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-backup-policy-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;
  t.after(() => {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const now = new Date(2026, 0, 2, 3, 4, 5);

  writeBackupSchedule({ enabled: true, cron: "* * * * *", encrypt: true }, dataDir);
  assert.equal(await runBackupScheduleTick(now), false);
  writeBackupSchedule({ enabled: true, cron: "* * * * *", cloud: true }, dataDir);
  assert.equal(await runBackupScheduleTick(now), false);
  assert.equal(readBackupSchedule(dataDir)?.lastRunAt, undefined);
});

test("worker schedule is single-flight and preserves concurrent configuration changes", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-backup-single-flight-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;
  t.after(() => {
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const now = new Date(2026, 0, 2, 3, 4, 5);
  writeBackupSchedule({ enabled: true, cron: "* * * * *" }, dataDir);
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const create = async () => {
    await blocked;
    return {
      backupPath: path.join(dataDir, "backups", "test"),
      backedUp: 1,
      skipped: 0,
      encrypted: false,
      cloudUploaded: null,
      manifest: {
        timestamp: now.toISOString(),
        version: "shiguangGateway-cli-v1" as const,
        encrypted: false,
        files: ["settings.json"],
      },
    };
  };

  const first = runBackupScheduleTick(now, { create });
  assert.equal(await runBackupScheduleTick(now, { create }), false);
  writeBackupSchedule({ enabled: false, cron: "15 2 * * *" }, dataDir);
  release();
  assert.equal(await first, true);

  assert.deepEqual(readBackupSchedule(dataDir), {
    enabled: false,
    cron: "15 2 * * *",
    lastRunAt: now.toISOString(),
  });
});
