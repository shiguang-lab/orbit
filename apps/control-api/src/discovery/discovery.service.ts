import { Injectable } from "@nestjs/common";
import * as results from "./handlers/results.handler.js";
import * as scanHandler from "./handlers/scan.handler.js";
import * as verifyHandler from "./handlers/verify.handler.js";

/** Application service for the local-only provider discovery management surface. */
@Injectable()
export class DiscoveryService {
  list(request: Request) {
    return results.list(request);
  }

  get(request: Request, id: string) {
    return results.get(request, id);
  }

  remove(request: Request, id: string) {
    return results.remove(request, id);
  }

  scan(request: Request) {
    return scanHandler.scan(request);
  }

  verify(request: Request, id: string) {
    return verifyHandler.verify(request, id);
  }
}

