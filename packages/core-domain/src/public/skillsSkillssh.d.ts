export interface SkillsShSkill { id: string; skillId: string; name: string; installs?: number; source: string; }
export interface SkillsShSearchResponse { query?: string; searchType?: string; skills: SkillsShSkill[]; count?: number; duration_ms?: number; }
export function searchSkillsSh(query: string, limit?: number): Promise<SkillsShSearchResponse>;
export function fetchSkillMd(source: string, skillId: string): Promise<string>;
