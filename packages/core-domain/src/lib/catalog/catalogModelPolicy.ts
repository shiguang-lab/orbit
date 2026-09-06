import { getModelEndpointDecision } from "../../../../open-sse/services/modelEndpointPolicy.ts";
import { isModelSelectable } from "../../../../open-sse/services/modelLifecycle.ts";

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
