import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { clearFleetSkillsCache, getFleetSkills } from "../src/agent-card/fleet-skills.js";

afterEach(() => {
  clearFleetSkillsCache();
  delete process.env.CONDUCTOR_HUB_URL;
  delete process.env.CONDUCTOR_HUB_TOKEN;
});

test("is disabled when the fleet URL is unset", async () => {
  let called = false;
  const result = await getFleetSkills({
    fetchImpl: (async () => { called = true; throw new Error("unexpected"); }) as typeof fetch,
  });
  assert.deepEqual(result, []);
  assert.equal(called, false);
});

test("fails open when the hub is unavailable or returns an invalid shape", async () => {
  process.env.CONDUCTOR_HUB_URL = "http://fleet.internal";
  assert.deepEqual(await getFleetSkills({
    fetchImpl: (async () => { throw new Error("offline"); }) as typeof fetch,
  }), []);
  clearFleetSkillsCache();
  assert.deepEqual(await getFleetSkills({
    fetchImpl: (async () => Response.json({ invalid: true })) as typeof fetch,
  }), []);
});

test("preserves authorization, skill projection, and the 60 second cache boundary", async () => {
  process.env.CONDUCTOR_HUB_URL = "http://fleet.internal/";
  process.env.CONDUCTOR_HUB_TOKEN = "fleet-token";
  let now = 1_000;
  let calls = 0;
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(String(input), "http://fleet.internal//v1/runners");
    assert.deepEqual(init?.headers, { authorization: "Bearer fleet-token" });
    return Response.json([
      { online: true, capabilities: { clis: [{ profile: "zeta", models: [{ id: "m1" }] }], skills: ["review"] } },
      { capabilities: { clis: [{ profile: "alpha" }], skills: ["build"] } },
      { online: false, capabilities: { clis: [{ profile: "offline" }], skills: ["hidden"] } },
    ]);
  }) as typeof fetch;

  const first = await getFleetSkills({ fetchImpl, nowMs: () => now });
  assert.deepEqual(first.map((skill) => skill.id), [
    "conductor-cli-alpha",
    "conductor-cli-zeta",
    "conductor-skill-build",
    "conductor-skill-review",
  ]);
  assert.match(first[1]!.description, /1 runner\(s\) online; models: m1/);

  now += 59_999;
  assert.strictEqual(await getFleetSkills({ fetchImpl, nowMs: () => now }), first);
  assert.equal(calls, 1);

  now += 1;
  assert.notStrictEqual(await getFleetSkills({ fetchImpl, nowMs: () => now }), first);
  assert.equal(calls, 2);
});
