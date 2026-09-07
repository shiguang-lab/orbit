import { Injectable } from "@nestjs/common";
import { handle, OPTIONS } from "./video-bridge-drilldown.handler.js";

@Injectable()
export class VideoBridgeDrilldownService {
  options() { return OPTIONS(); }
  consume(request: Request) { return handle(request); }
}
