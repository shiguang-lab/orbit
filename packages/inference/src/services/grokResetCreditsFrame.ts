import { probeFrameHeader } from "./grokCliQuotaFrame.ts";

const VARINT = 0;
const FIXED64 = 1;
const BYTES = 2;
const FIXED32 = 5;
const TRAILER = 0x80;

type Field = { number: number; wire: number; value: number | Buffer };

function readVarint(buffer: Buffer, offset: number): { value: number; next: number } | null {
  let value = 0n;
  let shift = 0n;
  for (let index = offset; index < buffer.length && shift <= 70n; index += 1, shift += 7n) {
    const byte = buffer[index];
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value: Number(value), next: index + 1 };
  }
  return null;
}

function fields(buffer: Buffer): Field[] | null {
  const result: Field[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    const tag = readVarint(buffer, offset);
    if (!tag || tag.value >>> 3 === 0) return null;
    offset = tag.next;
    const number = tag.value >>> 3;
    const wire = tag.value & 7;
    if (wire === VARINT) {
      const item = readVarint(buffer, offset); if (!item) return null;
      result.push({ number, wire, value: item.value }); offset = item.next;
    } else if (wire === BYTES) {
      const size = readVarint(buffer, offset); if (!size || size.value < 0 || size.next + size.value > buffer.length) return null;
      result.push({ number, wire, value: buffer.subarray(size.next, size.next + size.value) }); offset = size.next + size.value;
    } else if (wire === FIXED32 || wire === FIXED64) {
      const width = wire === FIXED32 ? 4 : 8; if (offset + width > buffer.length) return null;
      result.push({ number, wire, value: buffer.subarray(offset, offset + width) }); offset += width;
    } else return null;
  }
  return result;
}

function varintField(items: Field[], numbers: number[]): number | null {
  const item = items.find((field) => numbers.includes(field.number) && field.wire === VARINT);
  return item && typeof item.value === "number" ? item.value : null;
}

function bytesField(items: Field[], numbers: number[]): Buffer | null {
  const item = items.find((field) => numbers.includes(field.number) && field.wire === BYTES);
  return item && Buffer.isBuffer(item.value) ? item.value : null;
}

function timestamp(items: Field[], numbers: number[]): string | null {
  const raw = bytesField(items, numbers); if (!raw) return null;
  const nested = fields(raw); if (!nested) return null;
  const seconds = varintField(nested, [1]);
  if (seconds === null) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dataFrames(buffer: Buffer): { payloads: Buffer[]; status: number | null } | null {
  const payloads: Buffer[] = [];
  let status: number | null = null;
  let offset = 0;
  while (offset < buffer.length) {
    const frame = probeFrameHeader(buffer, offset); if (!frame) return null;
    const body = buffer.subarray(frame.payloadStart, frame.payloadStart + frame.payloadLength);
    if ((frame.flag & TRAILER) !== 0) {
      const match = body.toString("utf8").match(/grpc-status:\s*(\d+)/i);
      if (match) status = Number(match[1]);
    } else payloads.push(body);
    offset = frame.payloadStart + frame.payloadLength;
  }
  return { payloads, status };
}

export type GrokResetCreditToken = { tokenId: string; expiresAt: string | null };
export type GrokResetCreditsSnapshot = { count: number; nextExpiresAt: string | null };

export function decodeGrokResetCreditsFrame(buffer: Buffer):
  | { ok: true; snapshot: GrokResetCreditsSnapshot; tokens: GrokResetCreditToken[] }
  | { ok: false } {
  if (!buffer.length) return { ok: false };
  const framed = dataFrames(buffer);
  if (!framed || (framed.status !== null && framed.status !== 0)) return { ok: false };
  const top = framed.payloads.flatMap((payload) => fields(payload) ?? []);
  const tokens: GrokResetCreditToken[] = [];
  for (const item of top) {
    if (item.number !== 10 || item.wire !== BYTES || !Buffer.isBuffer(item.value)) continue;
    const nested = fields(item.value); if (!nested) continue;
    const id = bytesField(nested, [1, 10])?.toString("utf8").trim();
    if (id) tokens.push({ tokenId: id, expiresAt: timestamp(nested, [3, 30]) });
  }
  const expiries = tokens.map((token) => token.expiresAt).filter((value): value is string => Boolean(value)).sort();
  return { ok: true, tokens, snapshot: { count: tokens.length, nextExpiresAt: expiries[0] ?? null } };
}

function encodeVarint(input: number): Buffer {
  const bytes: number[] = []; let value = input;
  while (value > 127) { bytes.push((value & 127) | 128); value = Math.floor(value / 128); }
  bytes.push(value); return Buffer.from(bytes);
}

export function encodeRedeemResetRequest(tokenId: string): Buffer {
  const value = Buffer.from(tokenId, "utf8");
  return Buffer.concat([encodeVarint((10 << 3) | BYTES), encodeVarint(value.length), value]);
}

export function encodeGrpcWebRequest(payload: Buffer): Buffer {
  const header = Buffer.alloc(5); header.writeUInt32BE(payload.length, 1);
  return Buffer.concat([header, payload]);
}

export function decodeGrokGrpcStatus(buffer: Buffer, headerStatus?: string | null): { status: string; message: string | null } {
  let status = headerStatus?.trim() || "13"; let message: string | null = null;
  const framed = dataFrames(buffer);
  if (framed?.status !== null && framed?.status !== undefined) status = String(framed.status);
  const text = buffer.toString("utf8");
  const match = text.match(/grpc-message:\s*([^\r\n]+)/i);
  if (match) { try { message = decodeURIComponent(match[1]); } catch { message = match[1]; } }
  return { status, message };
}
