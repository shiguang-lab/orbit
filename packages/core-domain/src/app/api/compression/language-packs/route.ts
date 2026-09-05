import { NextResponse } from "next/server";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";
import {
  listCavemanRulePacks,
  listSupportedCompressionLanguages,
} from "../../../../../../open-sse/services/compression/index.ts";

export async function GET(req: Request) {
  const authError = await requireManagementAuth(req);
  if (authError) return authError;

  return NextResponse.json({
    languages: listSupportedCompressionLanguages(),
    packs: listCavemanRulePacks(),
  });
}
