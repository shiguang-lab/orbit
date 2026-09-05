#!/usr/bin/env node

// Verifies the Agent Skills route reads the package-local SKILL.md and never
// needs the upstream Orbit/GitHub fallback.
const { GET } = await import("../packages/gateway-runtime/src/app/api/agent-skills/[id]/raw/route.ts");
const response = await GET(
  new Request("http://localhost/api/agent-skills/omni-auth/raw"),
  { params: Promise.resolve({ id: "omni-auth" }) },
);
const body = await response.text();
if (response.status !== 200 || response.headers.get("X-Skill-Source") !== "filesystem" || !body.includes("Authentication")) {
  throw new Error(`agent skills local smoke failed: status=${response.status} source=${response.headers.get("X-Skill-Source")}`);
}
console.log(`agent skills local smoke: PASS (${body.length} bytes)`);
