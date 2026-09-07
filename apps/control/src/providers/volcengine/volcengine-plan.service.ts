import { Injectable } from "@nestjs/common";
import * as connect from "./handlers/connect.handler.js";
import * as status from "./handlers/status.handler.js";
import * as cancel from "./handlers/cancel.handler.js";
import * as code from "./handlers/code.handler.js";
import * as identity from "./handlers/identity.handler.js";
import * as resend from "./handlers/resend.handler.js";

/** Volcengine plan connection use cases. */
@Injectable()
export class VolcenginePlanService {
  connect(request: Request) {
    return connect.POST(request);
  }

  status(request: Request, sessionId: string) {
    return status.GET(request, { params: { sessionId } });
  }

  cancel(request: Request, sessionId: string) {
    return cancel.POST(request, { params: { sessionId } });
  }

  code(request: Request, sessionId: string) {
    return code.POST(request, { params: { sessionId } });
  }

  identity(request: Request, sessionId: string) {
    return identity.POST(request, { params: { sessionId } });
  }

  resend(request: Request, sessionId: string) {
    return resend.POST(request, { params: { sessionId } });
  }
}
