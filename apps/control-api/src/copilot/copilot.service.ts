import { Injectable } from "@nestjs/common";
import { processCopilotChat } from "@shiguang-gateway/core-domain/control/copilot";

@Injectable()
export class CopilotService {
  process(request: Parameters<typeof processCopilotChat>[0]) {
    return processCopilotChat(request);
  }
}
