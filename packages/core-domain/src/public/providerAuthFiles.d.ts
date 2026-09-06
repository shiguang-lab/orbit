export class ClaudeAuthFileError extends Error { status: number; code: string; }
export class CodexAuthFileError extends Error { status: number; code: string; }
export function buildClaudeAuthFile(connectionId: string): Promise<{ content: string; fileName: string }>;
export function writeClaudeAuthFileToLocalCli(connectionId: string): Promise<any>;
export function buildCodexAuthFile(connectionId: string): Promise<{ content: string; fileName: string }>;
export function writeCodexAuthFileToLocalCliIfNeeded(connectionId: string, options?: { force?: boolean }): Promise<any>;
