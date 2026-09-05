import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { isAuthenticated } from "../../../../../shared/utils/apiAuth.ts";
import { getMemoryCacheStats } from "../../../../../lib/semanticCache.ts";
import { sanitizeErrorMessage } from "../../../../../../open-sse/utils/error.ts";

export const dynamic = "force-dynamic";

function mediaCacheDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "/home/node";
  return path.join(home, ".shiguangGateway", "media_cache");
}

function readMediaStats() {
  const dir = mediaCacheDir();
  let totalBytes = 0;
  let totalFiles = 0;
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      try {
        totalBytes += fs.statSync(path.join(dir, entry.name)).size;
        totalFiles += 1;
      } catch {
        // A file removed during enumeration is not part of this snapshot.
      }
    }
  }
  return { totalBytes, totalFiles };
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const media = readMediaStats();
    const semantic = getMemoryCacheStats();
    return NextResponse.json({
      ...media,
      semanticEntries: semantic.size ?? 0,
      byModality: {
        image: { files: media.totalFiles, bytes: media.totalBytes },
        video: { files: 0, bytes: 0 },
        music: { files: 0, bytes: 0 },
        speech: { files: 0, bytes: 0 },
        transcription: { files: 0, bytes: 0 },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
