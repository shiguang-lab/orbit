import { Injectable } from "@nestjs/common";
import { postBulkWebSession } from "./provider-bulk-web-session.handler.js";

@Injectable()
export class ProviderBulkWebSessionService {
  handle(request: Request) {
    return postBulkWebSession(request);
  }
}
