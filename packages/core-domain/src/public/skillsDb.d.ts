export interface SkillPatch { enabled?: number | boolean; mode?: string; }
export function updateSkill(id: string, patch: SkillPatch): number;
