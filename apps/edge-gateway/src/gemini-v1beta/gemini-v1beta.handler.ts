import { z } from "zod";
import { GET as getModels, OPTIONS as modelsOptions } from "./v1beta-models.js";
import { convertGeminiToInternal } from "./gemini-request.js";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { buildClientRawRequest, handleChat } from "@shiguang-gateway/open-sse/handlers/chat";
import { initTranslators } from "@shiguang-gateway/open-sse/translator";
import {
  convertOpenAIResponseToGemini,
  transformOpenAISSEToGeminiSSE,
} from "@shiguang-gateway/open-sse/translator/response/openai-to-gemini-sse";

let initialized = false;

const geminiPartSchema = z.object({ text: z.string().optional() }).catchall(z.unknown());
const v1betaGeminiGenerateSchema = z
  .object({
    contents: z.array(z.object({
      role: z.string().optional(),
      parts: z.array(geminiPartSchema).optional(),
    }).catchall(z.unknown())).optional(),
    systemInstruction: z.object({ parts: z.array(geminiPartSchema).optional() })
      .catchall(z.unknown()).optional(),
    generationConfig: z.object({
      stream: z.boolean().optional(),
      maxOutputTokens: z.coerce.number().int().min(1).optional(),
      temperature: z.coerce.number().optional(),
      topP: z.coerce.number().optional(),
    }).catchall(z.unknown()).optional(),
  })
  .catchall(z.unknown())
  .superRefine((value, context) => {
    if (!value.contents && !value.systemInstruction) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "contents or systemInstruction is required", path: [] });
    }
  });

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await initTranslators();
  initialized = true;
}

export function OPTIONS(): Response {
  return modelsOptions();
}

export function GET(): Promise<Response> {
  return getModels();
}

export async function POST(request: Request, path: string[]): Promise<Response> {
  await ensureInitialized();
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({
      error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] },
    }, { status: 400 });
  }

  try {
    const modelAction = path.length >= 2 ? path[1] : path[0];
    const stream = modelAction.includes(":streamGenerateContent");
    const modelName = modelAction
      .replace(":streamGenerateContent", "")
      .replace(":generateContent", "");
    const model = path.length >= 2 ? `${path[0]}/${modelName}` : modelName;
    const validation = v1betaGeminiGenerateSchema.safeParse(rawBody);
    if (!validation.success) {
      return Response.json({
        error: {
          message: "Invalid request",
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            ...(("keys" in issue && Array.isArray(issue.keys)) ? { keys: issue.keys } : {}),
          })),
        },
      }, { status: 400 });
    }
    const convertedBody = convertGeminiToInternal(validation.data, model, stream);
    const translatedRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(convertedBody),
      signal: request.signal,
    });
    const response = await handleChat(
      translatedRequest,
      () => buildClientRawRequest(request, rawBody),
    );
    return stream
      ? transformOpenAISSEToGeminiSSE(response, model)
      : await convertOpenAIResponseToGemini(response, model);
  } catch (error) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(error), code: 500 } },
      { status: 500 },
    );
  }
}

export function OPTIONS_GENERATE(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
