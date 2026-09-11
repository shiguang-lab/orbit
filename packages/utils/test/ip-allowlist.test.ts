import assert from "node:assert/strict";
import test from "node:test";
import { isIpAllowed, isValidIpRule } from "../src/network/ip-allowlist.ts";

test("validates IPv4, IPv6 and exact CIDR prefix bounds", () => {
  for (const value of ["192.0.2.1", "::1", "2001:db8::/32", "0.0.0.0/0", "::/0", "::1/128"]) assert.equal(isValidIpRule(value), true, value);
  for (const value of ["", "example.com", "192.0.2.*", "999.1.1.1", "1.1.1.1/33", "::/129", "::/", "::/1/2", "::/1x", "::/01", "fe80::1%eth0"]) assert.equal(isValidIpRule(value), false, value);
});

test("matches both address families, mapped IPv4 and zero-length prefixes; denies unknown addresses", () => {
  assert.equal(isIpAllowed("192.0.2.10", ["192.0.2.0/24"]), true);
  assert.equal(isIpAllowed("192.0.3.10", ["192.0.2.0/24"]), false);
  assert.equal(isIpAllowed("::ffff:192.0.2.10", ["192.0.2.0/24"]), true);
  assert.equal(isIpAllowed("2001:db8::42", ["2001:db8::/32"]), true);
  assert.equal(isIpAllowed("2001:db9::42", ["2001:db8::/32"]), false);
  assert.equal(isIpAllowed("203.0.113.10", ["0.0.0.0/0"]), true);
  assert.equal(isIpAllowed("2001:db8::1", ["::/0"]), true);
  assert.equal(isIpAllowed("unknown", ["0.0.0.0/0"]), false);
  assert.equal(isIpAllowed("192.0.2.1", ["invalid"]), false);
  assert.equal(isIpAllowed("192.0.2.1", []), true);
});
