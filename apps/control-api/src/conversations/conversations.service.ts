import { Injectable } from "@nestjs/common";
import { GET as getConversations } from "./handlers/root.handler.js";
import { GET as getConversationTree } from "./handlers/tree.handler.js";

@Injectable()
export class ConversationsService {
  getConversations(request: Request) {
    return getConversations(request);
  }
  getTree(request: Request, id: string) {
    return getConversationTree(request, { params: { id } });
  }
}
