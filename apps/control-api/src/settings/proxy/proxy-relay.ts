/** Pure relay target guards shared by the three deployment backends. */
export function resolveRelayTarget(
  target: string,
  relayPath: string,
): { ok: true; url: string } | { ok: false; status: 400 | 403; reason: string } {
  let targetUrl: URL;
  try { targetUrl = new URL(target); } catch { return { ok: false, status: 400, reason: "invalid x-relay-target" }; }
  if (typeof relayPath !== "string" || relayPath.includes("@") || relayPath.includes("\\") || relayPath.charAt(0) !== "/") {
    return { ok: false, status: 403, reason: "forbidden x-relay-path" };
  }
  let finalUrl: URL;
  try { finalUrl = new URL(relayPath, targetUrl); } catch { return { ok: false, status: 403, reason: "forbidden x-relay-path" }; }
  if (finalUrl.hostname !== targetUrl.hostname || finalUrl.protocol !== targetUrl.protocol || finalUrl.port !== targetUrl.port || finalUrl.username || finalUrl.password) {
    return { ok: false, status: 403, reason: "forbidden x-relay-path (host mismatch)" };
  }
  return { ok: true, url: finalUrl.toString() };
}

export function isPrivateRelayHostname(h: string): boolean {
  if (!h) return true;
  let host = String(h).trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (host.length > 1 && host.endsWith(".")) host = host.slice(0, -1);
  if (!host) return true;
  if (host === "localhost" || host === "0.0.0.0" || host === "127.0.0.1" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host.startsWith("::")) return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]); const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 100 && b >= 64 && b <= 127)) return true;
    return false;
  }
  if (host.includes(":")) return host.startsWith("fc") || host.startsWith("fd") || /^fe[89ab]/.test(host);
  return false;
}
