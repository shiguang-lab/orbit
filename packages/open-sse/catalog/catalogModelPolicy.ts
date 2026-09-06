import { getModelEndpointDecision } from "../services/modelEndpointPolicy.ts";
import { isModelSelectable } from "../services/modelLifecycle.ts";

type CatalogModelPolicyInput = {
  id: string;
  supportedEndpoints?: readonly string[];
};

export function isUnifiedChatSourceModelSelectable(
  provider: string,
  model: CatalogModelPolicyInput
): boolean {
  return (
    isModelSelectable(provider, model.id) &&
    getModelEndpointDecision(provider, model.id, model.supportedEndpoints).reason !==
      "provider-policy"
  );
}
