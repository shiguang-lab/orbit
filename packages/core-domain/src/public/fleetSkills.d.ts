export interface FleetSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
}
export interface FleetSkillsOptions {
  fetchImpl?: typeof fetch;
  nowMs?: () => number;
}
export declare function getFleetSkills(opts?: FleetSkillsOptions): Promise<FleetSkill[]>;
export declare function clearFleetSkillsCache(): void;
