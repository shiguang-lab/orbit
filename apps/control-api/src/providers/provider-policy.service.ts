import { Injectable } from "@nestjs/common";
import {
  getCcAliasProviderSetting,
  getCcAliasSettingsBulk,
  setCcAliasModelSetting,
  setCcAliasProviderSetting,
  type CcAliasSetting,
} from "@shiguang-gateway/core-domain/db/provider-cc-alias";
import {
  deleteInterceptionRules,
  getInterceptionRules,
  setInterceptionRules,
  type ProviderInterceptionRules,
} from "@shiguang-gateway/core-domain/db/provider-interception-rules";
import {
  deleteParamFilterConfig,
  getParamFilterConfig,
  setParamFilterConfig,
  type ProviderParamFilter,
} from "@shiguang-gateway/core-domain/db/provider-param-filters";

/** Provider-local policy configuration used by the control-plane dashboard. */
@Injectable()
export class ProviderPolicyService {
  getCcAlias(providerId: string) {
    const provider = getCcAliasProviderSetting(providerId);
    const { models: allModels } = getCcAliasSettingsBulk();
    const prefix = `${providerId}/`;
    const models: Record<string, "on" | "off"> = {};
    for (const [key, value] of allModels) {
      if (key.startsWith(prefix)) models[key.slice(prefix.length)] = value;
    }
    return { provider, models };
  }

  updateCcAlias(
    providerId: string,
    update: { scope: "provider" | "model"; modelId?: string; value: CcAliasSetting },
  ): void {
    if (update.scope === "provider") {
      setCcAliasProviderSetting(providerId, update.value);
    } else {
      setCcAliasModelSetting(providerId, update.modelId ?? "", update.value);
    }
  }

  getInterception(providerId: string): ProviderInterceptionRules {
    return getInterceptionRules(providerId) ?? {
      interceptSearch: undefined,
      interceptFetch: undefined,
    };
  }

  updateInterception(providerId: string, rules: ProviderInterceptionRules): void {
    setInterceptionRules(providerId, rules);
  }

  deleteInterception(providerId: string): void {
    deleteInterceptionRules(providerId);
  }

  getParamFilters(providerId: string): ProviderParamFilter {
    return getParamFilterConfig(providerId) ?? { block: [], allow: [], autoLearn: false };
  }

  updateParamFilters(providerId: string, config: ProviderParamFilter): void {
    setParamFilterConfig(providerId, config);
  }

  deleteParamFilters(providerId: string): void {
    deleteParamFilterConfig(providerId);
  }
}
