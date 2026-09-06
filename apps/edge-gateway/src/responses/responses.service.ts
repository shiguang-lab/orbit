import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./responses.handler.js";

@Injectable()
export class ResponsesService {
  post(request: Request): Promise<Response> { return POST(request); }
  options(): Response { return OPTIONS(); }
}
