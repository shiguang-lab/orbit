import { Injectable } from "@nestjs/common";
import { listAuditEntries, getAuditStatistics } from "./handlers/audit.handler.js";
import { getStatus } from "./handlers/status.handler.js";
import { listTools } from "./handlers/tools.handler.js";
import {
  handleMcpSSE,
  handleMcpStreamableHTTP,
} from "@shiguang-gateway/open-sse/mcp-server/httpTransport";

@Injectable()
export class McpService {
  listAuditEntries(request: Request) { return listAuditEntries(request); }
  getAuditStatistics(request: Request) { return getAuditStatistics(request); }
  getStatus(request: Request) { return getStatus(request); }
  listTools(request: Request) { return listTools(request); }
  sse(request: Request) { return handleMcpSSE(request); }
  stream(request: Request) { return handleMcpStreamableHTTP(request); }
}
