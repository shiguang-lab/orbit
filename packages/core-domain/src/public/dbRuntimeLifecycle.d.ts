export function closeDbInstance(options?: {
  checkpointMode?: "PASSIVE" | "FULL" | "RESTART" | "TRUNCATE" | null;
}): boolean;
