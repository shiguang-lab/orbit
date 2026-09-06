import { Injectable } from "@nestjs/common";
import { resolveNetworkInfo } from "@shiguang-gateway/core-domain/control/network-info";

@Injectable()
export class NetworkInfoService {
  read(requestHost?: string | null) {
    return resolveNetworkInfo(requestHost);
  }
}
