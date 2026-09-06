import { Injectable } from "@nestjs/common";
import { getSettings } from "@shiguang-gateway/core-domain/control/settings";

export type SkillsProvider = "skillsmp" | "skillssh";

const DEFAULT_SKILLS_PROVIDER: SkillsProvider = "skillssh";

/** Resolves the marketplace provider configured by the control application. */
@Injectable()
export class SkillsProviderSettingsService {
  normalize(value: unknown): SkillsProvider {
    return value === "skillssh" || value === "skillsmp" ? value : DEFAULT_SKILLS_PROVIDER;
  }

  async get(): Promise<SkillsProvider> {
    const settings = (await getSettings()) as Record<string, unknown>;
    return this.normalize(settings.skillsProvider);
  }
}
