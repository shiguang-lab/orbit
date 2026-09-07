import { Injectable } from "@nestjs/common";
import { handleVideoDrilldownRequest } from "./video-bridge-drilldown-broker.handler.js";
import { handleVideoExtractionBrokerRequest } from "./runtime/extraction-handler.js";

@Injectable()
export class VideoBridgeBrokerService {
  extract(request: Request) { return handleVideoExtractionBrokerRequest(request); }
  drilldown(request: Request) { return handleVideoDrilldownRequest(request); }
}
