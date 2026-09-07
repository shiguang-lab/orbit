import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./explain-routing.handler.js";

@Injectable()
export class ExplainRoutingService {
  get(request: Request): Promise<Response> {
    return GET(request);
  }

  options(): Response {
    return OPTIONS();
  }
}
