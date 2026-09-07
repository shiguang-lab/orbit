import { Injectable } from "@nestjs/common";
import { POST } from "./handlers/report.handler.js";

@Injectable()
export class IssuesService {
  report(request: Request): Promise<Response> {
    return POST(request);
  }
}
