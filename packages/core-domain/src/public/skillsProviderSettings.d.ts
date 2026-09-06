export type SkillsProvider = "skillsmp" | "skillssh";
export const DEFAULT_SKILLS_PROVIDER: SkillsProvider;
export function normalizeSkillsProvider(value: unknown): SkillsProvider;
export function getSkillsProviderSetting(): Promise<SkillsProvider>;
