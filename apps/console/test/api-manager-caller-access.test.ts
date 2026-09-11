import assert from "node:assert/strict";
import test from "node:test";
import { callerClientName, isCallerIpRuleValid, parseCallerIpRules } from "../src/features/api-manager/caller-access.ts";

test("pasted IP lists normalize separators and duplicates", () => {
  assert.deepEqual(parseCallerIpRules(" 192.0.2.1,\n::1，192.0.2.1 \n2001:db8::/32"), ["192.0.2.1", "::1", "2001:db8::/32"]);
  assert.deepEqual(parseCallerIpRules(undefined), []);
});

test("IP form rejects invalid addresses and prefixes before submission", () => {
  for (const value of ["192.0.2.1", "0.0.0.0/0", "192.0.2.1/32", "::1", "::/0", "2001:db8::1/128", "::ffff:192.0.2.1"]) assert.ok(isCallerIpRuleValid(value), value);
  for (const value of ["", "999.0.0.1", "01.2.3.4", "host.test", "192.0.2.1/33", "::/129", "::/1/2", "::/", "fe80::1%en0", "1:2:3:4:5:6:7:8:9", "192.0.2.*"]) assert.equal(isCallerIpRuleValid(value), false, value);
});

test("client summary recognizes tools without displaying an unbounded User-Agent", () => {
  assert.equal(callerClientName("claude-cli/2.0"), "Claude Code");
  assert.equal(callerClientName("Cursor/1.2"), "Cursor");
  assert.equal(callerClientName("codex_cli_rs/0.1"), "Codex");
  assert.equal(callerClientName(null), null);
  assert.equal(callerClientName("custom-tool/1.0 (details)"), "custom-tool");
  assert.equal(callerClientName("x".repeat(512))?.length, 40);
});
