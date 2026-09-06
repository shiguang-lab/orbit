export interface GitHubSkillRepo {
  fullName: string;
  htmlUrl: string;
  description: string;
  stars: number;
  forks: number;
  topics: string[];
  score: number;
  hasSkillFile: boolean;
  isAwesome: boolean;
  updatedAt: string | null;
  license: string | null;
}
export interface SearchOptions { token?: string; minStars?: number; maxResults?: number; }
export function searchGitHubSkills(options?: SearchOptions): Promise<{ repos: GitHubSkillRepo[]; errors: string[] }>;
