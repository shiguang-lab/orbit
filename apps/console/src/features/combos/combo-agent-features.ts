export interface ComboAgentFeatureInput {
  systemMessage: string;
  toolFilterRegex: string;
  contextCacheProtection: boolean;
  isEdit: boolean;
}

export interface ComboAgentFeaturePatch {
  system_message?: string | null;
  tool_filter_regex?: string | null;
  context_cache_protection?: true | null;
}

/** Build create/update semantics: omitted means absent, null means clear. */
export function buildComboAgentFeaturePatch({
  systemMessage,
  toolFilterRegex,
  contextCacheProtection,
  isEdit,
}: ComboAgentFeatureInput): ComboAgentFeaturePatch {
  const patch: ComboAgentFeaturePatch = {};
  const message = systemMessage.trim();
  const filter = toolFilterRegex.trim();

  if (message) patch.system_message = message;
  else if (isEdit) patch.system_message = null;

  if (filter) patch.tool_filter_regex = filter;
  else if (isEdit) patch.tool_filter_regex = null;

  if (contextCacheProtection) patch.context_cache_protection = true;
  else if (isEdit) patch.context_cache_protection = null;

  return patch;
}
