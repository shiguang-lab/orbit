import { Injectable } from "@nestjs/common";
import { POST as handleTelegramUpdate } from "./handlers/update.handler.js";

@Injectable()
export class TelegramService {
  update(request: Request) {
    return handleTelegramUpdate(request);
  }
}
