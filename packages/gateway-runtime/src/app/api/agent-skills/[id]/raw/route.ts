/**
 * GET /api/agent-skills/[id]/raw
 *
 * Returns the raw SKILL.md content for a given skill as text/markdown.
 * Resolution: packaged local filesystem only. Standalone deployments do not
 * call an upstream repository.
 *
 * Response: text/markdown; charset=utf-8
 * 404 if skill not found in catalog.
 * 502 if upstream GitHub fetch fails.
 */
import { buildErrorBody } from "../../../../../../open-sse/utils/error.ts";
import { getSkillById, fetchSkillMarkdown } from "../../../../../lib/agentSkills/catalog.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return new Response(JSON.stringify(buildErrorBody(400, "Missing skill id")), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate the skill exists in catalog before attempting fetch
    const skill = getSkillById(id);
    if (!skill) {
      return new Response(JSON.stringify(buildErrorBody(404, `Skill not found: ${id}`)), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const markdown = await fetchSkillMarkdown(id);

    // Return the full markdown content (frontmatter + body reconstructed)
    const content =
      markdown.frontmatter.name
        ? `---\nname: ${markdown.frontmatter.name}\ndescription: ${markdown.frontmatter.description}\n---\n${markdown.body}`
        : markdown.body;

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Skill-Source": markdown.source,
        "X-Skill-Fetched-At": markdown.fetchedAt,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/agent-skills/[id]/raw error:", error);
    return new Response(JSON.stringify(buildErrorBody(500, "Failed to fetch skill content")), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
