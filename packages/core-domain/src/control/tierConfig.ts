/**
 * Shared tier configuration operations.
 *
 * The control app owns the HTTP transport and authorization.  Runtime apps
 * consume the same persisted configuration through the open-sse resolver, so
 * the database read/write contract stays behind this explicit package surface
 * rather than importing a legacy route or a private source path.
 */
export {
  initTierConfigTable,
  loadTierConfig,
  loadTierConfigFromDb,
  saveTierConfig,
} from "../lib/db/tierConfig.ts";

export type { TierConfig } from "@shiguang-gateway/open-sse/services/tierTypes";
