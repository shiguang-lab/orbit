import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { closeDbInstance } from "@orbit/core/db/runtime-lifecycle";
import { closeProxyLogStorage } from "@orbit/core/runtime/proxy-log-lifecycle";

@Injectable()
export class DatabaseRuntimeLifecycleService implements OnApplicationShutdown {
  onApplicationShutdown(): void {
    closeProxyLogStorage();
    closeDbInstance();
  }
}
