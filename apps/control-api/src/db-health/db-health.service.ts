import { Injectable } from "@nestjs/common";
import { runManagedDbHealthCheck } from "@shiguang-gateway/core-domain/db/health";
import { sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";

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
