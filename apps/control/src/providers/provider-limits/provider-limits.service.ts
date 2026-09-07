import { Injectable } from "@nestjs/common";
import { GET, PUT } from "./provider-limits.handler.js";

@Injectable()
export class ProviderLimitsService {
  get(request: Request, provider: string): Promise<Response> {
    return GET(request, provider);
  }

  put(request: Request, provider: string): Promise<Response> {
    return PUT(request, provider);
  }
}
