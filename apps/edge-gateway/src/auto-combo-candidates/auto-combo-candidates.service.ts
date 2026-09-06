import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./handlers/auto-combo-candidates.handler.js";

@Injectable()
export class AutoComboCandidatesService {
  get(request: Request, channel: string): Promise<Response> {
    return GET(request, { params: { channel } });
  }

  options(): Response {
    return OPTIONS();
  }
}
