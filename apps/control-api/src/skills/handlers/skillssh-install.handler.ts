import { z } from "zod";
import { validateBody, isValidationFailure } from "@orbit/core/shared/validation/helpers";
import { GLOBAL_SKILL_OWNER_ID, skillRegistry } from "@orbit/core/control/skills-registry";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import type { SkillsProviderSettingsService } from "../providers/skills-provider-settings.service.js";
import type { SkillsShProvider } from "../providers/skills-sh.provider.js";

const skillsshInstallSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(1024),
  source: z.string().min(1),
  skillId: z.string().min(1),
  version: z.string().default("1.0.0"),
});

export async function POST(
  request: Request,
  skillsSh: SkillsShProvider,
  providerSettings: SkillsProviderSettingsService,
) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const provider = await providerSettings.get();
    if (provider !== "skillssh") {
      return Response.json(
        {
          error:
            "Active skills provider is not skills.sh. Switch provider in Settings → Memory & Skills.",
        },
        { status: 409 }
      );
    }

    const rawBody = await request.json();
    const validation = validateBody(skillsshInstallSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json(validation.error, { status: 400 });
    }
    const { name, description, source, skillId, version } = validation.data;

    const skillMdContent = await skillsSh.fetchSkillMd(source, skillId);

    const skill = await skillRegistry.register({
      name,
      version,
      description,
      schema: { input: { content: "string" }, output: { result: "string" } },
      handler: `// Installed from skills.sh\n// Source: ${source}/${skillId}\n// SKILL.md content:\n${skillMdContent}`,
      apiKeyId: GLOBAL_SKILL_OWNER_ID,
      enabled: true,
      mode: "auto",
      sourceProvider: "skillssh",
      tags: ["popular", "community"],
      installCount: 1,
    });

    return Response.json({ success: true, id: skill.id });
  } catch (err: unknown) {
    const error = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return Response.json({ error }, { status: 500 });
  }
}
