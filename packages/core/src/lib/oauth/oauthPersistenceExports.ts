/**
 * Persistence-only operations consumed by the provider OAuth runtime.
 *
 * Network exchanges and browser/device clients live in open-sse; this leaf
 * deliberately exposes only the credential records they need to persist.
 */
export {
  createProviderConnection,
  getCachedProviderConnectionById,
  getProviderConnections,
  updateProviderConnection,
} from "../localDb.ts";
export { pickCodexConnectionForUser } from "./utils/codexConnectionSelection.ts";
