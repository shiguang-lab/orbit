/**
 * ORM-neutral entity metadata for the SQLite schema.
 *
 * The deployable apps currently use the project's synchronous SQLite adapter
 * rather than TypeORM/Drizzle.  Keeping this metadata free of a driver (or a
 * Nest module) gives every app one canonical table/column vocabulary without
 * moving queries and mutations out of their owning domain.
 */
export type SqliteColumnType = "TEXT" | "INTEGER" | "REAL" | "BLOB";

export type EntityOwner = "control-api" | "edge-gateway" | "realtime" | "worker";

export interface EntityColumn {
  readonly name: string;
  readonly type: SqliteColumnType;
  readonly nullable: boolean;
  readonly primaryKey?: boolean;
  readonly autoIncrement?: boolean;
  /** SQLite expression or literal as written in the migration, when present. */
  readonly default?: string;
}

export interface EntityDefinition {
  /** Stable domain-facing name; tableName remains the physical SQLite name. */
  readonly entityName: string;
  readonly tableName: string;
  readonly owner: EntityOwner;
  readonly columns: readonly EntityColumn[];
}

export function column(
  name: string,
  type: SqliteColumnType,
  options: Omit<EntityColumn, "name" | "type" | "nullable"> &
    Partial<Pick<EntityColumn, "nullable">> = {}
): EntityColumn {
  return { name, type, nullable: true, ...options };
}
