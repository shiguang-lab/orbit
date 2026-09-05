/**
 * Provides access to the provider REGISTRY. Used to enable mocking in tests.
 * The REGISTRY contains provider configuration including models and costs.
 */
import { REGISTRY } from "../../config/providerRegistry.ts";

export function getProviderRegistry() {
  return REGISTRY;
}
