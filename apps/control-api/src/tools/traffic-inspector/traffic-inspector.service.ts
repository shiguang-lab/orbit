import { Injectable } from "@nestjs/common";
import {
  annotateRequest,
  captureHttpProxy,
  captureSystemProxy,
  deleteHost,
  exportHar,
  getRequest,
  ingestRequest,
  patchHost,
  replayRequest,
  toggleTlsIntercept,
} from "./traffic-inspector.handlers.js";

/** Application service for Traffic Inspector capture and request operations. */
@Injectable()
export class TrafficInspectorService {
  captureHttpProxy(request: Request) { return captureHttpProxy(request); }
  captureSystemProxy(request: Request) { return captureSystemProxy(request); }
  toggleTlsIntercept(request: Request) { return toggleTlsIntercept(request); }
  exportHar(request: Request) { return exportHar(request); }
  deleteHost(host: string) { return deleteHost(host); }
  patchHost(request: Request, host: string) { return patchHost(request, host); }
  ingestRequest(request: Request) { return ingestRequest(request); }
  getRequest(id: string) { return getRequest(id); }
  annotateRequest(request: Request, id: string) { return annotateRequest(request, id); }
  replayRequest(id: string) { return replayRequest(id); }
}
