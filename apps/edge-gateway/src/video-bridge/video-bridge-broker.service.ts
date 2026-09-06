import { Injectable } from "@nestjs/common";
import { handleVideoDrilldownRequest } from "./video-bridge-drilldown-broker.handler.js";
import { handleVideoExtractionBrokerRequest } from "@shiguang-gateway/core-domain/control/video-bridge-extract";

@Injectable()
export class VideoBridgeBrokerService {
  extract(request: Request) { return handleVideoExtractionBrokerRequest(request); }
  drilldown(request: Request) { return handleVideoDrilldownRequest(request); }
}
