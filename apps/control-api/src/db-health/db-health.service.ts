import { Injectable } from "@nestjs/common";
import { runManagedDbHealthCheck } from "@orbit/core/db/health";
import { sanitizeErrorMessage } from "@orbit/utils/errors/api-response";

@Injectable()
export class DbHealthService {
  diagnose() {
    return runManagedDbHealthCheck({ autoRepair: false });
  }

  repair() {
    return runManagedDbHealthCheck({ autoRepair: true });
  }

  errorMessage(error: unknown): string {
    return sanitizeErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
