import { createLogger } from "@shiguang-gateway/runtime-logging";

const log = createLogger("sse");

function spreadData(data: unknown): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === "string") return { detail: data };
  if (typeof data === "object") return data as Record<string, unknown>;
  return { detail: String(data) };
}

export function debug(tag: string, message: string, data?: unknown) {
  log.debug(tag, message, spreadData(data));
}

export function info(tag: string, message: string, data?: unknown) {
  log.info(tag, message, spreadData(data));
}

export function warn(tag: string, message: string, data?: unknown) {
  log.warn(tag, message, spreadData(data));
}

export function error(tag: string, message: string, data?: unknown) {
  log.error(tag, message, spreadData(data));
}

export function request(method: string, path: string, extra?: unknown) {
  log.info("HTTP", `📥 ${method} ${path}`, { method, path, ...spreadData(extra) });
}
