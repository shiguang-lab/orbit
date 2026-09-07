import { NextResponse, type NextRequest } from "./next-compat.js";
import { z } from "zod";
import {
  createCloudAgentCredentialsTable,
  listCloudAgentCredentials,
  saveCloudAgentCredential,
  maskApiKey,
} from "../domain/credentials.js";
import { getCloudAgentCorsHeaders, requireCloudAgentManagementAuth } from "../domain/api.js";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";

const SaveCredentialSchema = z.object({
  providerId: z.enum(["jules", "devin", "codex-cloud", "cursor-cloud"]),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { headers: getCloudAgentCorsHeaders(request) });
}

export async function GET(request: NextRequest) {
  try {
    createCloudAgentCredentialsTable();
    const authError = await requireCloudAgentManagementAuth(request);
    if (authError) return authError;

    const data = listCloudAgentCredentials();

    return NextResponse.json({ data }, { headers: getCloudAgentCorsHeaders(request) });
  } catch (error) {
    console.error("Failed to list cloud agent credentials", error);
    return NextResponse.json(
      {
        error:
          sanitizeErrorMessage(error instanceof Error ? error.message : "Unknown error") ||
          "Internal server error",
      },
      { status: 500, headers: getCloudAgentCorsHeaders(request) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    createCloudAgentCredentialsTable();
    const authError = await requireCloudAgentManagementAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const validation = SaveCredentialSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: getCloudAgentCorsHeaders(request) }
      );
    }

    const { providerId, apiKey, baseUrl } = validation.data;

    saveCloudAgentCredential(providerId, apiKey, baseUrl);

    return NextResponse.json(
      {
        data: {
          providerId,
          apiKey: maskApiKey(apiKey),
          baseUrl: baseUrl ?? null,
        },
      },
      { status: 201, headers: getCloudAgentCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Failed to save cloud agent credentials", error);
    return NextResponse.json(
      {
        error:
          sanitizeErrorMessage(error instanceof Error ? error.message : "Unknown error") ||
          "Internal server error",
      },
      { status: 500, headers: getCloudAgentCorsHeaders(request) }
    );
  }
}
