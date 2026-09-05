import type { IncomingMessage, ServerResponse } from "node:http";
export function attachRequestStreamGuards(req: IncomingMessage, res: ServerResponse): void;
export function installProcessCrashGuard(log?: (...args: unknown[]) => void): void;
