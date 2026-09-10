/**
 * Decide whether a combo target passes the API-key model policy.
 *
 * The request-level policy has already admitted the requested combo. When the
 * allow-list names that combo, checking each inner target against the same
 * allow-list would incorrectly reject every member. Independent target-level
 * restrictions (block-list and non-public-model policy) must still run.
 */

export type ComboTargetKeyPolicyInfo = {
  allowedModels?: string[] | null;
  blockedModels?: string[] | null;
  disableNonPublicModels?: boolean | null;
  modelAccessMode?: string | null;
};

function modelMatchesAllowPattern(pattern: string, model: string): boolean {
  if (pattern.endsWith("/*")) return model.startsWith(pattern.slice(0, -1));
  return pattern === model;
}

function allowListCoversRequestedCombo(
  allowedModels: string[] | null | undefined,
  requestedModel: string
): boolean {
  if (!allowedModels?.length || !requestedModel) return false;
  return allowedModels.some((pattern) => modelMatchesAllowPattern(pattern, requestedModel));
}

export async function comboTargetPassesKeyModelPolicy(options: {
  apiKey: string | null | undefined;
  apiKeyInfo: ComboTargetKeyPolicyInfo | null | undefined;
  requestedModel: string;
  targetModel: string;
  effort?: string;
  isModelAllowedForKey: (key: string, model: string, effort?: string) => Promise<boolean>;
}): Promise<boolean> {
  const {
    apiKey,
    apiKeyInfo,
    requestedModel,
    targetModel,
    effort,
    isModelAllowedForKey,
  } = options;
  if (!apiKey || !apiKeyInfo) return true;

  const hasTargetIndependentRestrictions =
    Boolean(apiKeyInfo.blockedModels?.length) || apiKeyInfo.disableNonPublicModels === true;
  const hasAllowListRestriction =
    apiKeyInfo.modelAccessMode === "restricted" || Boolean(apiKeyInfo.allowedModels?.length);
  if (!hasAllowListRestriction && !hasTargetIndependentRestrictions) return true;

  if (
    !hasTargetIndependentRestrictions &&
    allowListCoversRequestedCombo(apiKeyInfo.allowedModels, requestedModel)
  ) {
    return true;
  }

  return isModelAllowedForKey(apiKey, targetModel, effort);
}
