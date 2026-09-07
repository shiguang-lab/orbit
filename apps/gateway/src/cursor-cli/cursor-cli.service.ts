import { Injectable } from "@nestjs/common";
import { handleCursorCliProxy } from "@orbit/inference/handlers/cursorCliProxy";

@Injectable()
export class CursorCliService {
  proxy(request: Request, path: string[]): Promise<Response> {
    return handleCursorCliProxy(request, path);
  }
}
