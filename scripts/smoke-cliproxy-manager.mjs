#!/usr/bin/env node
/** Real Linux container smoke: official release, proxy auth, reporting and crash recovery. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

const suffix = randomBytes(6).toString("hex");
const volume = `orbit-node-smoke-${suffix}`;
const name = `orbit-node-smoke-${suffix}`;
let latestReport;
const receiver = createServer(async (request, response) => {
  assert.equal(request.headers.authorization, undefined);
  let body = "";
  for await (const chunk of request) body += chunk;
  latestReport = JSON.parse(body);
  response.writeHead(204).end();
});
await new Promise((resolve) => receiver.listen(0, "0.0.0.0", resolve));
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
let origin;
async function call(path, method = "GET", body) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
async function until(fn, seconds = 60) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (await fn()) return;
    await delay(1000);
  }
  throw new Error("Timed out waiting for node state");
}
async function action(action, version = "latest") {
  const job = await call("/v1/instances/smoke/actions", "POST", {
    action,
    version,
  });
  await until(async () => {
    const result = await call(`/v1/jobs/${job.id}`);
    if (result.status === "failed") {
      const logs = await call("/v1/instances/smoke/logs");
      throw new Error(`${action}: ${result.error}\n${logs.text}`);
    }
    return result.status === "succeeded";
  }, 600);
}
try {
  docker(
    "run",
    "-d",
    "--name",
    name,
    "--init",
    "--add-host=host.docker.internal:host-gateway",
    "-p",
    "127.0.0.1::8792",
    "-v",
    `${volume}:/data`,
    "-e",
    "CLIPROXY_MANAGER_ID=smoke-node",
    "-e",
    `CLIPROXY_MANAGER_REPORT_URL=http://host.docker.internal:${receiver.address().port}/report`,
    "-e",
    "CLIPROXY_MANAGER_INTERVAL=1s",
    process.env.CLIPROXY_MANAGER_TEST_IMAGE || "orbit-cliproxy-manager:verification",
  );
  origin = `http://${docker("port", name, "8792/tcp")}`;
  await until(async () => {
    try {
      return (await fetch(`${origin}/healthz`)).ok;
    } catch {
      return false;
    }
  });
  await call("/v1/instances", "POST", {
    id: "smoke",
    name: "Official release smoke",
    port: 18317,
  });
  await action("install");
  await action("start");
  await call(
    "/v1/instances/smoke/inference/v1/models",
    "GET",
    undefined,
  );
  await until(() =>
    latestReport?.instances.some((i) => i.id === "smoke" && i.healthy),
  );
  assert.ok(!JSON.stringify(latestReport).includes("apiKey"));
  assert.ok(!JSON.stringify(latestReport).includes("managementKey"));
  let snapshot = await call("/v1/node");
  console.log(
    `PASS: Linux ${snapshot.arch}, official CLIProxyAPI ${snapshot.instances[0].version}, installation/start/proxy/report`,
  );
  const pid = snapshot.instances[0].pid;
  docker("exec", name, "sh", "-c", 'kill -9 "$1"', "sh", String(pid));
  await until(async () => {
    const s = await call("/v1/node");
    return s.instances[0].healthy && s.instances[0].pid !== pid;
  });
  console.log("PASS: crashed child recovered automatically");
  docker("kill", "--signal=KILL", name);
  docker("start", name);
  origin = `http://${docker("port", name, "8792/tcp")}`;
  await until(async () => {
    try {
      return (await call("/v1/node")).instances[0].healthy;
    } catch {
      return false;
    }
  });
  console.log(
    "PASS: container restart preserved instance and restored running state",
  );
  await action("stop");
  snapshot = await call("/v1/node");
  assert.equal(snapshot.instances[0].state, "stopped");
  assert.equal(snapshot.instances[0].desiredState, "stopped");
  console.log("PASS: explicit stop remains stopped");
} finally {
  try {
    docker("rm", "-f", name);
  } catch {
    /* already removed */
  }
  try {
    docker("volume", "rm", volume);
  } catch {
    /* creation failed */
  }
  await new Promise((resolve) => receiver.close(resolve));
}
