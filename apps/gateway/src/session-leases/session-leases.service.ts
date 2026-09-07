import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./session-leases.handler.js";

@Injectable()
export class SessionLeasesService {
  handleOptions() {
    return OPTIONS();
  }

  handlePost(request: Request) {
    return POST(request);
  }
}
