import { NextResponse } from "next/server";
import { getComboBuilderOptions } from "../../../../../lib/combos/builderOptions.ts";
import { requireManagementAuth } from "../../../../../lib/api/requireManagementAuth.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const options = await getComboBuilderOptions();
    return NextResponse.json(options);
  } catch (error) {
    console.log("Error fetching combo builder options:", error);
    return NextResponse.json({ error: "Failed to fetch combo builder options" }, { status: 500 });
  }
}
