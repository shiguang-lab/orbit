import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export async function GET(): Promise<Response> {
  const candidates = [
    path.join(process.cwd(), "packages/core/docs/guides/CODEX-CLI-CONFIGURATION.md"),
    path.join(process.cwd(), "docs/guides/CODEX-CLI-CONFIGURATION.md"),
  ];
  try {
    const file = candidates.find((candidate) => existsSync(candidate));
    if (!file) return Response.json({ error: "Guide not found" }, { status: 404 });
    return Response.json({ content: await readFile(file, "utf8") });
  } catch { return Response.json({ error: "Guide not found" }, { status: 404 }); }
}
