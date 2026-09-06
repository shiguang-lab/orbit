export interface SkillSchema { input: Record<string, unknown>; output: Record<string, unknown>; }
export interface Skill {
  id: string;
  apiKeyId: string;
  name: string;
  version: string;
  description: string;
  schema: SkillSchema;
  handler: string;
  enabled: boolean;
  mode?: "on" | "off" | "auto";
  sourceProvider?: "skillsmp" | "skillssh" | "local";
  tags?: string[];
  installCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
export const GLOBAL_SKILL_OWNER_ID: string;
export const skillRegistry: {
  register(input: {
    name: string;
    version?: string;
    description?: string;
    schema: SkillSchema;
    handler: string;
    enabled?: boolean;
    apiKeyId: string;
    mode?: "on" | "off" | "auto";
    sourceProvider?: "skillsmp" | "skillssh" | "local";
    tags?: string[];
    installCount?: number;
  }): Promise<Skill>;
  unregisterById(id: string): Promise<boolean>;
  loadFromDatabase(apiKeyId?: string): Promise<void>;
  list(apiKeyId?: string): Skill[];
};
