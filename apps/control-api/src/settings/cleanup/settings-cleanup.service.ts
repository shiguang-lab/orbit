import { Injectable } from "@nestjs/common";
import { POST as purgeCallLogs } from "./handlers/purge-call-logs.handler.js";
import { POST as purgeDetailedLogs } from "./handlers/purge-detailed-logs.handler.js";
import { POST as purgeLogs } from "./handlers/purge-logs.handler.js";
import { POST as purgeQuotaSnapshots } from "./handlers/purge-quota-snapshots.handler.js";
import { POST as purgeRequestHistory } from "./handlers/purge-request-history.handler.js";

/** Use cases for destructive settings-data cleanup operations. */
@Injectable()
export class SettingsCleanupService {
  purgeCallLogs(request: Request) {
    return purgeCallLogs(request);
  }

  purgeDetailedLogs(request: Request) {
    return purgeDetailedLogs(request);
  }

  purgeLogs(request: Request) {
    return purgeLogs(request);
  }

  purgeQuotaSnapshots(request: Request) {
    return purgeQuotaSnapshots(request);
  }

  purgeRequestHistory(request: Request) {
    return purgeRequestHistory(request);
  }
}
