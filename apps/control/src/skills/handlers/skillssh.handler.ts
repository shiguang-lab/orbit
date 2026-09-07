import { isAuthenticated } from "@orbit/core/control/authenticated";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import type { SkillsShProvider } from "../providers/skills-sh.provider.js";

export async function GET(request: Request, skillsSh: SkillsShProvider) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);

    const data = await skillsSh.search(q, limit);
    return Response.json({
      skills: data.skills.map((s) => ({
        id: s.id,
        skillId: s.skillId,
        name: s.name,
        installs: s.installs,
        source: s.source,
      })),
    });
  } catch (err: unknown) {
    const error = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return Response.json({ error }, { status: 500 });
  }
}
