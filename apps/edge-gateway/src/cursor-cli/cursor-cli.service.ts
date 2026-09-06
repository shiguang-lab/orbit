import { Injectable } from "@nestjs/common";
import { handleCursorCliProxy } from "@shiguang-gateway/open-sse/handlers/cursorCliProxy";

@Injectable()
export class CursorCliService {
  proxy(request: Request, path: string[]): Promise<Response> {
    return handleCursorCliProxy(request, path);
  }
}
