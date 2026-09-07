import { Injectable } from "@nestjs/common";
import { processCopilotChat } from "./runtime/engine.js";

@Injectable()
export class CopilotService {
  process(request: Parameters<typeof processCopilotChat>[0]) {
    return processCopilotChat(request);
  }
}
