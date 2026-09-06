import { Injectable } from "@nestjs/common";
import {
  getAllFallbackChains,
  registerFallback,
  removeFallback,
} from "@shiguang-gateway/core-domain/control/fallback-policy";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import {
  registerFallbackSchema,
  removeFallbackSchema,
} from "@shiguang-gateway/core-domain/validation/routing";

@Injectable()
export class FallbackService {
  list(): Response {
    try {
      return Response.json(getAllFallbackChains());
    } catch (error) {
      console.error("Error fetching fallback chains:", error);
      return Response.json({ error: "Failed to fetch fallback chains" }, { status: 500 });
    }
  }

  async create(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return this.invalidJson();
    }
    const validation = validateBody(registerFallbackSchema, body);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    try {
      const { model, chain } = validation.data;
      registerFallback(model, chain);
      return Response.json({ success: true, model });
    } catch (error) {
      console.error("Error registering fallback chain:", error);
      return Response.json({ error: "Failed to register fallback chain" }, { status: 500 });
    }
  }

  async remove(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return this.invalidJson();
    }
    const validation = validateBody(removeFallbackSchema, body);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    try {
      const removed = removeFallback(validation.data.model);
      return Response.json({ success: true, removed });
    } catch (error) {
      console.error("Error removing fallback chain:", error);
      return Response.json({ error: "Failed to remove fallback chain" }, { status: 500 });
    }
  }

  private invalidJson(): Response {
    return Response.json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 });
  }
}
