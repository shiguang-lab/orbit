import type { DatabaseSettings } from "../types/databaseSettings.js";

export type UserDatabaseSettings = Omit<DatabaseSettings, "location" | "stats">;

export function getDatabaseSettings(): DatabaseSettings;
export function getUserDatabaseSettings(): UserDatabaseSettings;
export function updateDatabaseSettings(
  updates: Partial<UserDatabaseSettings>,
): UserDatabaseSettings;
