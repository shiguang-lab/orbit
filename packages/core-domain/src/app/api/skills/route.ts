import { NextResponse } from "next/server";
import { skillRegistry } from "../../../lib/skills/registry.ts";
import { parsePaginationParams, buildPaginatedResponse } from "../../../shared/types/pagination.ts";
import { getSkillsProviderSetting } from "../../../lib/skills/providerSettings.ts";
import { requireManagementAuth } from "../../../lib/api/requireManagementAuth.ts";
import { matchesSearch } from "../../../shared/utils/turkishText.ts";
import { sanitizeErrorMessage } from "../../../../../open-sse/utils/error.ts";

const POPULAR_BY_PROVIDER = {
  skillsmp: ["web-search", "file-reader", "sql-assistant", "devops-helper", "docs-assistant"],
  skillssh: ["git", "terminal", "postgres", "kubernetes", "playwright"],
} as const;

export async function GET(request?: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    await skillRegistry.loadFromDatabase();
    const provider = await getSkillsProviderSetting();
    const url = request?.url || "http://localhost/api/skills";
    const parsedUrl = new URL(url);
    const query = parsedUrl.searchParams.get("q")?.trim() || "";
    const modeFilter = parsedUrl.searchParams.get("mode");
    const sourceFilter = parsedUrl.searchParams.get("source");

    let allSkills = skillRegistry.list();

    if (query) {
      allSkills = allSkills.filter((skill) => {
        const tagsText = Array.isArray(skill.tags) ? skill.tags.join(" ") : "";
        return (
          matchesSearch(skill.name, query) ||
          matchesSearch(skill.description, query) ||
          matchesSearch(tagsText, query)
        );
      });
    }

    if (modeFilter === "on" || modeFilter === "off" || modeFilter === "auto") {
      allSkills = allSkills.filter(
        (skill) => (skill.mode || (skill.enabled ? "on" : "off")) === modeFilter
      );
    }

    if (sourceFilter === "skillsmp" || sourceFilter === "skillssh" || sourceFilter === "local") {
      allSkills = allSkills.filter((skill) => (skill.sourceProvider || "local") === sourceFilter);
    }

    const params = parsePaginationParams(parsedUrl.searchParams);
    const paged = allSkills.slice((params.page - 1) * params.limit, params.page * params.limit);
    const response = buildPaginatedResponse(paged, allSkills.length, params);
    return NextResponse.json({
      ...response,
      skills: response.data,
      provider,
      popularDefaults: POPULAR_BY_PROVIDER[provider],
    });
  } catch (err: unknown) {
    const error = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error }, { status: 500 });
  }
}
