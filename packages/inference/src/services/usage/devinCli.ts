import { parseResetTime, type UsageQuota } from "./quota.ts";

type Field = { field: number; varint?: number; bytes?: Uint8Array };
const varint = (buf: Uint8Array, start: number) => { let value = 0, shift = 0, i = start; while (i < buf.length && shift <= 63) { const byte = buf[i++]!; value += (byte & 0x7f) * 2 ** shift; if (!(byte & 0x80)) return { value, next: i }; shift += 7; } return null; };
const encodeVarint = (value: number) => { const out: number[] = []; do { let byte = value & 0x7f; value = Math.floor(value / 128); if (value) byte |= 0x80; out.push(byte); } while (value); return out; };
const stringField = (field: number, value: string) => { const bytes = [...new TextEncoder().encode(value)]; return [(field << 3) | 2, ...encodeVarint(bytes.length), ...bytes]; };

export function decodeDevinProto(buf: Uint8Array): Field[] | null {
  const fields: Field[] = []; let i = 0;
  while (i < buf.length) {
    const tag = varint(buf, i); if (!tag) return null; i = tag.next;
    const field = tag.value >>> 3, wire = tag.value & 7;
    if (wire === 0) { const value = varint(buf, i); if (!value) return null; fields.push({ field, varint: value.value }); i = value.next; }
    else if (wire === 2) { const len = varint(buf, i); if (!len || len.next + len.value > buf.length) return null; fields.push({ field, bytes: buf.subarray(len.next, len.next + len.value) }); i = len.next + len.value; }
    else if (wire === 1) i += 8; else if (wire === 5) i += 4; else return null;
  }
  return fields;
}
const bytes = (fields: Field[] | null, id: number) => fields?.find((f) => f.field === id)?.bytes;
const number = (fields: Field[] | null, id: number) => fields?.find((f) => f.field === id)?.varint ?? null;
export function parseDevinUserStatus(buf: Uint8Array) {
  const user = bytes(decodeDevinProto(buf), 1); const planBytes = user && bytes(decodeDevinProto(user), 13); if (!planBytes) return null;
  const status = decodeDevinProto(planBytes); const info = bytes(status, 1); const nameBytes = info && bytes(decodeDevinProto(info), 2);
  return { plan: nameBytes ? new TextDecoder().decode(nameBytes) : null, daily: number(status, 14), weekly: number(status, 15), dailyReset: number(status, 17), weeklyReset: number(status, 18) };
}
const quota = (remaining: number, reset: number | null, displayName: string): UsageQuota => { const r = Math.min(100, Math.max(0, remaining)); return { used: 100-r, total: 100, remaining: r, remainingPercentage: r, resetAt: parseResetTime(reset), unlimited: false, displayName }; };
export async function getDevinCliUsage(token?: string | null) {
  if (!token?.trim()) return { message: "Devin token not available." };
  const metadata = [...stringField(1,"chisel"), ...stringField(2,"0.0.0-dev"), ...stringField(3,token.trim()), ...stringField(4,"en"), ...stringField(5,"linux"), ...stringField(7,"0.0.0-dev")];
  const body = new Uint8Array([...encodeVarint(10), ...encodeVarint(metadata.length), ...metadata]);
  try {
    const response = await fetch(`${process.env.DEVIN_SEAT_API_URL?.trim() || "https://server.codeium.com"}/exa.seat_management_pb.SeatManagementService/GetUserStatus`, { method:"POST", headers:{"Content-Type":"application/proto","Connect-Protocol-Version":"1",Authorization:`Basic ${token}-${token}`}, body, signal:AbortSignal.timeout(10000) });
    if (!response.ok) return { message: `Devin GetUserStatus failed (${response.status})` };
    const data = parseDevinUserStatus(new Uint8Array(await response.arrayBuffer())); if (!data) return { message:"Devin quota response could not be parsed." };
    const quotas: Record<string, UsageQuota> = {}; if (data.daily !== null) quotas.daily = quota(data.daily,data.dailyReset,"Daily Agentic Quota"); if (data.weekly !== null) quotas.weekly = quota(data.weekly,data.weeklyReset,"Weekly Agentic Quota");
    return Object.keys(quotas).length ? { plan:data.plan || "Devin", quotas } : { message:"Devin quota fields not present." };
  } catch (error) { return { message:`Devin usage error: ${error instanceof Error ? error.message : String(error)}` }; }
}
