import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { isAuthenticated } from "../../../../../shared/utils/apiAuth.ts";
import { clearMemoryCache } from "../../../../../lib/semanticCache.ts";
import { sanitizeErrorMessage } from "../../../../../../../open-sse/utils/error.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const modality = typeof body?.modality === "string" ? body.modality : "all";
    const home = process.env.HOME || process.env.USERPROFILE || "/home/node";
    const dir = path.join(home, ".shiguangGateway", "media_cache");
    let freedBytes = 0;
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const file = path.join(dir, entry.name);
        try {
          freedBytes += fs.statSync(file).size;
          fs.unlinkSync(file);
        } catch {
          // Continue clearing the remaining cache entries.
        }
      }
    }
    clearMemoryCache();
    return NextResponse.json({ success: true, purgedModality: modality, freedBytes });
  } catch (error) {
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
