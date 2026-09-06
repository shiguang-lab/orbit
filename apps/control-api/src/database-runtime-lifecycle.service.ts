import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { closeDbInstance } from "@shiguang-gateway/core-domain/db/runtime-lifecycle";
import { closeProxyLogStorage } from "@shiguang-gateway/core-domain/runtime/proxy-log-lifecycle";

@Injectable()
export class DatabaseRuntimeLifecycleService implements OnApplicationShutdown {
  onApplicationShutdown(): void {
    closeProxyLogStorage();
    closeDbInstance();
  }
}
