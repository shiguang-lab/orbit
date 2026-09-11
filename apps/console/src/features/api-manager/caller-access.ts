export function parseCallerIpRules(value: string | undefined): string[] {
  return [...new Set((value ?? "").split(/[\s,，]+/).filter(Boolean))];
}

export function isCallerIpRuleValid(rule: string): boolean {
  const [address, prefix, extra] = rule.split("/");
  if (extra !== undefined) return false;
  const ipv4 = /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(address)
    && address.split(".").every((part) => Number(part) <= 255);
  let ipv6 = false;
  if (address.includes(":") && /^[\da-f:.]+$/i.test(address)) {
    try { ipv6 = new URL(`http://[${address}]/`).hostname.startsWith("["); } catch { /* Invalid IPv6 literal. */ }
  }
  return (ipv4 || ipv6) && (prefix === undefined || (/^(0|[1-9]\d*)$/.test(prefix) && Number(prefix) <= (ipv4 ? 32 : 128)));
}

/** User-Agent is a client hint, not a verified application identity. */
export function callerClientName(userAgent: string | null | undefined): string | null {
  if (!userAgent?.trim()) return null;
  if (/claude-code|claude-cli|anthropic-ai\/claude/i.test(userAgent)) return "Claude Code";
  if (/cursor/i.test(userAgent)) return "Cursor";
  if (/codex/i.test(userAgent)) return "Codex";
  if (/github.*copilot|copilot.*github/i.test(userAgent)) return "GitHub Copilot";
  if (/opencode/i.test(userAgent)) return "OpenCode";
  if (/python-httpx/i.test(userAgent)) return "Python HTTPX";
  if (/python-requests/i.test(userAgent)) return "Python Requests";
  if (/curl\//i.test(userAgent)) return "cURL";
  return userAgent.split(/[\s/]/)[0].slice(0, 40) || null;
}
