import { ensureGamificationSchema as ensureSchema } from "@orbit/contracts/db-schema";
import { getDbInstance } from "@orbit/core/db/connection";

export function ensureGamificationSchema(): void {
  ensureSchema(getDbInstance());
}
