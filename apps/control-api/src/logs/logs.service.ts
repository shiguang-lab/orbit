import { Injectable } from "@nestjs/common";
import { GET as getConsoleLogs } from "./handlers/console.handler.js";
import { GET as getLogDetail, POST as updateLogDetail } from "./handlers/detail.handler.js";
import { GET as exportLogs } from "./handlers/export.handler.js";
import { GET as getLogById } from "./handlers/log-by-id.handler.js";
import { GET as getUsageLogs } from "./handlers/usage-logs.handler.js";
import { GET as getRequestLogs } from "./handlers/request-logs.handler.js";
import { GET as getCallLogs } from "./handlers/call-logs.handler.js";
import { GET as getCallLogById } from "./handlers/call-log-by-id.handler.js";
import { GET as getProxyLogs, DELETE as deleteProxyLogs } from "./handlers/proxy-logs.handler.js";

/** Management-facing log use cases. Transport concerns stay in LogsController. */
@Injectable()
export class LogsService {
  getConsole(request: Request) {
    return getConsoleLogs(request);
  }

  getDetail(request: Request) {
    return getLogDetail(request);
  }

  updateDetail(request: Request) {
    return updateLogDetail(request);
  }

  export(request: Request) {
    return exportLogs(request);
  }

  getById(request: Request, id: string) {
    return getLogById(request, { params: { id } });
  }

  getUsage(request: Request) {
    return getUsageLogs(request);
  }

  getRequests(request: Request) {
    return getRequestLogs(request);
  }

  getCalls(request: Request) {
    return getCallLogs(request);
  }

  getCallById(request: Request, id: string) {
    return getCallLogById(request, { params: { id } });
  }

  getProxy(request: Request) {
    return getProxyLogs(request);
  }

  deleteProxy(_request?: Request) {
    return deleteProxyLogs();
  }
}
