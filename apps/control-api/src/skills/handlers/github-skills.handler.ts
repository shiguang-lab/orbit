import { z } from "zod";
import {
  resolveInstallPath,
  searchGitHubSkills,
} from "@shiguang-gateway/core-domain/control/skills-github";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { matchesSearch } from "../../common/turkish-text.js";
import { buildErrorBody, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";

const installSkillSchema = z.object({
  repoName: z.string().min(1),
  targets: z.array(z.string().min(1)).optional().default(["hermes"]),
  description: z.string().optional().default(""),
});

export async function GET(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const rawMinStars = Number.parseInt(searchParams.get("minStars") ?? "1", 10);
    const rawMaxResults = Number.parseInt(searchParams.get("maxResults") ?? "50", 10);
    const minScore = Number.parseFloat(searchParams.get("minScore") ?? "0");
    const query = searchParams.get("query") ?? "";
    const { repos, errors } = await searchGitHubSkills({
      minStars: Number.isNaN(rawMinStars) ? 1 : rawMinStars,
      maxResults: Number.isNaN(rawMaxResults) ? 5 : Math.min(rawMaxResults, 200),
    });

    let filtered = repos;
    if (minScore > 0) filtered = filtered.filter((repo) => repo.score >= minScore);
    if (query) {
      filtered = filtered.filter(
        (repo) => matchesSearch(repo.fullName, query) || matchesSearch(repo.description, query),
      );
    }

    return Response.json({
      skills: filtered.map((repo) => ({
        fullName: repo.fullName,
        stars: repo.stars,
        score: repo.score,
        description: repo.description.slice(0, 300),
        hasSkillFile: repo.hasSkillFile,
        license: repo.license,
      })),
      total: filtered.length,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error) {
    return Response.json(
      { error: sanitizeErrorMessage(error), skills: [], total: 0 },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const parsed = installSkillSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(buildErrorBody(400, "repoName is required"), { status: 400 });
    }
    const { repoName, targets, description } = parsed.data;
    const skillName = repoName.split("/").pop() || repoName;
    const results = targets.map((target) => {
      try {
        const destDir = resolveInstallPath(target, skillName, description);
        return { target, ok: true, action: "planned", destDir };
      } catch (error) {
        return {
          target,
          ok: false,
          action: "error",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    return Response.json({ repoName, skillName, results, allOk: results.every((result) => result.ok) });
  } catch (error) {
    return Response.json(buildErrorBody(500, error instanceof Error ? error.message : String(error)), {
      status: 500,
    });
  }
}
