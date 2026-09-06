import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { closeDbInstance } from "@shiguang-gateway/core-domain/db/runtime-lifecycle";

@Injectable()
export class DatabaseRuntimeLifecycleService implements OnApplicationShutdown {
  onApplicationShutdown(): void {
    closeDbInstance();
  }
}
