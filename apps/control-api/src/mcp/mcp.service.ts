import { Injectable } from "@nestjs/common";
import { listAuditEntries, getAuditStatistics } from "./handlers/audit.handler.js";
import { getStatus } from "./handlers/status.handler.js";
import { listTools } from "./handlers/tools.handler.js";

@Injectable()
export class McpService {
  listAuditEntries(request: Request) { return listAuditEntries(request); }
  getAuditStatistics(request: Request) { return getAuditStatistics(request); }
  getStatus(request: Request) { return getStatus(request); }
  listTools(request: Request) { return listTools(request); }
}
