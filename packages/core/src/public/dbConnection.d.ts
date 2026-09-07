export interface DatabaseRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface DatabaseStatement<Row = unknown> {
  run(...params: unknown[]): DatabaseRunResult;
  get(...params: unknown[]): Row | undefined;
  all(...params: unknown[]): Row[];
}

export interface DatabaseConnection {
  readonly driver: "better-sqlite3" | "node:sqlite" | "bun:sqlite" | "sql.js";
  readonly open: boolean;
  readonly name: string;
  readonly inTransaction?: boolean;
  readonly raw: unknown;
  prepare<Row = unknown>(sql: string): DatabaseStatement<Row>;
  exec(sql: string): void;
  pragma(pragma: string, options?: { simple?: boolean }): unknown;
  transaction<Args extends unknown[], Result>(fn: (...args: Args) => Result): (...args: Args) => Result;
  immediate(fn: () => void): void;
  backup(destination: string): Promise<void>;
  checkpoint(mode?: string): void;
  close(): void;
}

export function getDbInstance(): DatabaseConnection;
