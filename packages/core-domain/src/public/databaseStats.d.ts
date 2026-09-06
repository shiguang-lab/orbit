export interface DatabaseStats {
  totalSize: number;
  pageSize: number;
  pageCount: number;
  tables: Array<{ name: string; rowCount: number; size: number }>;
  indexes: Array<{ name: string; tableName: string }>;
  walSize?: number;
  cacheSize: number;
}
export function getDatabaseStats(): DatabaseStats;
