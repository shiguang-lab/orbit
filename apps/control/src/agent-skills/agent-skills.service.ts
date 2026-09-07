import { Injectable } from "@nestjs/common";
import {
  computeCoverage,
  fetchSkillMarkdown,
  filterCatalog,
  GenerateBodySchema,
  getSkillById,
  generateAgentSkills,
  ListQuerySchema,
} from "@orbit/core/control/agent-skills";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { buildErrorBody } from "@orbit/inference/utils/error";

@Injectable()
export class AgentSkillsService {
  async list(request: Request): Promise<Response> {
    try {
      const { searchParams } = new URL(request.url);
      const parsed = ListQuerySchema.safeParse({
        category: searchParams.get("category") ?? undefined,
        area: searchParams.get("area") ?? undefined,
      });
      if (!parsed.success) {
        return Response.json(
          buildErrorBody(400, parsed.error.issues[0]?.message ?? "Invalid query parameters"),
          { status: 400 },
        );
      }
      const skills = filterCatalog(parsed.data);
      return Response.json({ skills, count: skills.length, coverage: computeCoverage() });
    } catch (error) {
      console.error("[API] GET /api/agent-skills error:", error);
      return Response.json(buildErrorBody(500, "Failed to load agent skills catalog"), { status: 500 });
    }
  }

  async coverage(): Promise<Response> {
    try {
      return Response.json(computeCoverage());
    } catch (error) {
      console.error("[API] GET /api/agent-skills/coverage error:", error);
      return Response.json(buildErrorBody(500, "Failed to compute skill coverage"), { status: 500 });
    }
  }

  async get(id: string): Promise<Response> {
    try {
      if (!id) return Response.json(buildErrorBody(400, "Missing skill id"), { status: 400 });
      const skill = getSkillById(id);
      if (!skill) return Response.json(buildErrorBody(404, `Skill not found: ${id}`), { status: 404 });
      return Response.json(skill);
    } catch (error) {
      console.error("[API] GET /api/agent-skills/[id] error:", error);
      return Response.json(buildErrorBody(500, "Failed to load skill"), { status: 500 });
    }
  }

  async raw(id: string): Promise<Response> {
    try {
      if (!id) return this.jsonError(400, "Missing skill id");
      if (!getSkillById(id)) return this.jsonError(404, `Skill not found: ${id}`);
      const markdown = await fetchSkillMarkdown(id);
      const content = markdown.frontmatter.name
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
      return this.jsonError(500, "Failed to fetch skill content");
    }
  }

  async generate(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return this.jsonError(400, "Request body must be valid JSON");
    }
    const parsed = GenerateBodySchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      return this.jsonError(400, parsed.error.issues[0]?.message ?? "Invalid request body");
    }
    try {
      return Response.json(await generateAgentSkills(parsed.data));
    } catch (error) {
      console.error("[API] POST /api/agent-skills/generate error:", error);
      return this.jsonError(500, "Generator failed");
    }
  }

  private jsonError(status: number, message: string): Response {
    return Response.json(buildErrorBody(status, message), { status });
  }
}
