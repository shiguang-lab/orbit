import { Injectable } from "@nestjs/common";
import { captureModes } from "./handlers/capture-modes.js";
import { createHost, listHosts } from "./handlers/hosts.js";
import { clearRequests, listRequests } from "./handlers/requests.js";
import { createRecordingSession, listRecordingSessions } from "./handlers/sessions.js";

@Injectable()
export class ToolsService {
  captureModes() { return captureModes(); }
  listHosts() { return listHosts(); }
  createHost(request: Request) { return createHost(request); }
  listRequests(request: Request) { return listRequests(request); }
  clearRequests() { return clearRequests(); }
  listSessions() { return listRecordingSessions(); }
  createSession(request: Request) { return createRecordingSession(request); }
}
