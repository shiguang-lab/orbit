import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { closeDbInstance } from "@orbit/core/db/runtime-lifecycle";

@Injectable()
export class DatabaseRuntimeLifecycleService implements OnApplicationShutdown {
  onApplicationShutdown(): void {
    closeDbInstance();
  }
}
