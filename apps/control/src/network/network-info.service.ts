import { Injectable } from "@nestjs/common";
import { TunnelsService } from "../tunnels/tunnels.service.js";
import { resolveNetworkInfo } from "./network-info.js";

@Injectable()
export class NetworkInfoService {
  constructor(private readonly tunnels: TunnelsService) {}

  read(requestHost?: string | null) {
    return resolveNetworkInfo(requestHost, {
      getTailscaleStatus: () => this.tunnels.tailscaleStatus(requestHost),
    });
  }
}
