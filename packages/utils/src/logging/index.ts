/** Structured console logging shared by gateway runtimes. */
import { getAppLogFormat, getAppLogLevel } from "@orbit/config/logEnv";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LEVELS;
type LogMetadata = Record<string, unknown>;
type ConsoleFn = (...data: unknown[]) => void;
type TaggedLogger = {
  debug: (message: string, meta?: LogMetadata | null) => void;
  info: (message: string, meta?: LogMetadata | null) => void;
  warn: (message: string, meta?: LogMetadata | null) => void;
  error: (message: string, meta?: LogMetadata | null) => void;
};
type RequestScopedLogger = {
  debug: (tag: string, msg: string, data?: LogMetadata | null) => void;
  info: (tag: string, msg: string, data?: LogMetadata | null) => void;
  warn: (tag: string, msg: string, data?: LogMetadata | null) => void;
  error: (tag: string, msg: string, data?: LogMetadata | null) => void;
};

function isLogLevel(value: string): value is LogLevel {
  return Object.prototype.hasOwnProperty.call(LEVELS, value);
}

const configuredLevel = getAppLogLevel("info").toLowerCase();
const currentLevel = isLogLevel(configuredLevel) ? LEVELS[configuredLevel] : LEVELS.info;
const jsonFormat = getAppLogFormat("text") === "json";
let requestCounter = 0;

export function generateRequestId() {
  return `req_${Date.now()}_${++requestCounter}`;
}

export function maskKey(key: string | null | undefined): string {
  if (!key || key.length < 12) return "(redacted)";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function getConsoleFn(level: LogLevel): ConsoleFn {
  switch (level) {
    case "debug": return console.debug;
    case "warn": return console.warn;
    case "error": return console.error;
    default: return console.log;
  }
}

function formatMeta(meta?: LogMetadata | null): string {
  if (!meta || typeof meta !== "object") return "";
  const cleaned: LogMetadata = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined && value !== null) cleaned[key] = value;
  }
  return Object.keys(cleaned).length > 0 ? ` ${JSON.stringify(cleaned)}` : "";
}

export function logger(tag: string): TaggedLogger {
  const emit = (level: LogLevel, message: string, meta?: LogMetadata | null): void => {
    if (LEVELS[level] < currentLevel) return;
    const consoleFn = getConsoleFn(level);
    if (jsonFormat) {
      const entry: Record<string, unknown> = { ts: new Date().toISOString(), level, tag, msg: message };
      if (meta && typeof meta === "object" && Object.keys(meta).length > 0) entry.data = meta;
      consoleFn(JSON.stringify(entry));
    } else {
      consoleFn(`[${level.toUpperCase()}] [${tag}] ${message}${formatMeta(meta)}`);
    }
  };
  return {
    debug: (message, meta) => emit("debug", message, meta),
    info: (message, meta) => emit("info", message, meta),
    warn: (message, meta) => emit("warn", message, meta),
    error: (message, meta) => emit("error", message, meta),
  };
}

export function createLogger(requestId: string | null = null): RequestScopedLogger {
  const emit = (level: LogLevel, tag: string, message: string, data?: LogMetadata | null): void => {
    if (LEVELS[level] < currentLevel) return;
    const consoleFn = getConsoleFn(level);
    if (jsonFormat) {
      const entry: Record<string, unknown> = { ts: new Date().toISOString(), level, tag, msg: message };
      if (requestId) entry.reqId = requestId;
      if (data && typeof data === "object" && Object.keys(data).length > 0) entry.data = data;
      consoleFn(JSON.stringify(entry));
    } else {
      const ts = new Date().toISOString().slice(11, 23);
      const prefix = requestId ? `[${requestId}]` : "";
      consoleFn(`${ts} ${prefix}[${tag}] ${message}${formatMeta(data)}`);
    }
  };
  return {
    debug: (tag, msg, data) => emit("debug", tag, msg, data),
    info: (tag, msg, data) => emit("info", tag, msg, data),
    warn: (tag, msg, data) => emit("warn", tag, msg, data),
    error: (tag, msg, data) => emit("error", tag, msg, data),
  };
}

export const defaultLogger = createLogger();
export const log = defaultLogger;
export default logger;
