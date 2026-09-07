#!/usr/bin/env node

// Verifies the control-owned Agent Skills surface reads the package-local
// SKILL.md and never needs the upstream Orbit/GitHub fallback.
const { AgentSkillsService } = await import(
  "../apps/control/src/agent-skills/agent-skills.service.ts"
);
const response = await new AgentSkillsService().raw("omni-auth");
const body = await response.text();
if (response.status !== 200 || response.headers.get("X-Skill-Source") !== "filesystem" || !body.includes("Authentication")) {
  throw new Error(`agent skills local smoke failed: status=${response.status} source=${response.headers.get("X-Skill-Source")}`);
}
console.log(`agent skills local smoke: PASS (${body.length} bytes)`);
// Route modules may initialize runtime resources while being imported. This
// is a one-shot verification command, so terminate explicitly after the
// assertion instead of waiting on unrelated handles in CI.
process.exit(0);
