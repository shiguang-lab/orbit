import { ensureGamificationSchema as ensureSchema } from "@shiguang-gateway/db-schema";
import { getDbInstance } from "@shiguang-gateway/core-domain/db/ping";

export function ensureGamificationSchema(): void {
  ensureSchema(getDbInstance());
}
