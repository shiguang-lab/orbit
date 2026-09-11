import { BlockList, isIP } from "node:net";

/** Accept literal IPv4/IPv6 addresses and CIDRs, never hostnames or wildcards. */
export function isValidIpRule(rule: string): boolean {
  const parts = rule.split("/");
  const family = isIP(parts[0]);
  if (!family || parts.length > 2 || parts[0].includes("%")) return false;
  if (parts.length === 1) return true;
  return /^(0|[1-9]\d*)$/.test(parts[1]) && Number(parts[1]) <= (family === 4 ? 32 : 128);
}

export function isIpAllowed(ip: string, rules: readonly string[]): boolean {
  if (!rules.length) return true;
  if (!isIP(ip)) return false;
  const list = new BlockList();
  for (const rule of rules) {
    if (!isValidIpRule(rule)) continue;
    const [address, prefix] = rule.split("/");
    const family = isIP(address) === 4 ? "ipv4" : "ipv6";
    if (prefix === undefined) list.addAddress(address, family);
    else list.addSubnet(address, Number(prefix), family);
  }
  return list.check(ip, isIP(ip) === 4 ? "ipv4" : "ipv6");
}
