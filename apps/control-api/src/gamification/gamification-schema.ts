import { ensureGamificationSchema as ensureSchema } from "@shiguang-gateway/db-schema";
import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";

export function ensureGamificationSchema(): void {
  ensureSchema(getDbInstance());
}
