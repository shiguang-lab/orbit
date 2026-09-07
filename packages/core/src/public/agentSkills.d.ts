import type { z } from "zod";

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: "api" | "cli" | "config" | "external";
  area: string;
  endpoints?: string[];
  cliCommands?: string[];
  icon?: string;
  isEntry?: boolean;
  isNew?: boolean;
  rawUrl: string;
  githubUrl: string;
}
export interface SkillCoverage {
  api: { have: number; total: number };
  cli: { have: number; total: number };
  config: { have: number; total: number };
  totalSkills: number;
  generatedAt: string;
}
export interface SkillMarkdown {
  id: string;
  frontmatter: { name: string; description: string };
  body: string;
  source: "filesystem" | "github" | "generated";
  fetchedAt: string;
}
export interface GeneratorOptions {
  dryRun: boolean;
  prune: boolean;
  outputDir?: string;
  onlyIds?: string[];
}
export interface GeneratorReport {
  generated: string[];
  unchanged: string[];
  pruned: string[];
  orphansDetected: string[];
  errors: Array<{ id: string; error: string }>;
}

export const API_SKILL_IDS: readonly string[];
export const CLI_SKILL_IDS: readonly string[];
export const CONFIG_SKILL_IDS: readonly string[];
export function getSkillsDir(): string;
export function getCatalog(): AgentSkill[];
export function getSkillById(id: string): AgentSkill | null;
export function filterCatalog(opts: {
  category?: "api" | "cli" | "config";
  area?: string;
}): AgentSkill[];
export function computeCoverage(): SkillCoverage;
export function refreshCatalog(): void;
export function fetchSkillMarkdown(id: string): Promise<SkillMarkdown>;
export function generateAgentSkills(opts: GeneratorOptions): Promise<GeneratorReport>;

export const ListQuerySchema: z.ZodType<{
  category?: "api" | "cli" | "config";
  area?: string;
}>;
export const GenerateBodySchema: z.ZodType<{
  dryRun: boolean;
  prune: boolean;
  onlyIds?: string[];
}>;
