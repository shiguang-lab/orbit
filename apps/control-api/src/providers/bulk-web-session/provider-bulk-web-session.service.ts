import { Injectable } from "@nestjs/common";
import { postBulkWebSession } from "@shiguang-gateway/core-domain/control/provider-bulk-web-session";

@Injectable()
export class ProviderBulkWebSessionService {
  handle(request: Request) {
    return postBulkWebSession(request);
  }
}
