import { Injectable } from "@nestjs/common";
import {
  countCallLogsAfterRowId,
  createClientForDestination,
  createLogExportDestination,
  decryptDestinationConfig,
  deleteLogExportDestination,
  describeLogExportDestinationTypes,
  encryptDestinationConfig,
  getLogExportDestination,
  getLogExportDestinations,
  getLogExportDestinationType,
  getMaxCallLogRowId,
  LOG_EXPORT_JOB_ID,
  mergeDestinationConfig,
  redactDestinationConfig,
  requiresEncryptionKey,
  resetLogExportCursor,
  runSingleLogExport,
  updateLogExportDestination,
  type CreateLogExportDestinationInput,
  type LogExportDestinationRow,
  type UpdateLogExportDestinationInput,
} from "@orbit/core/control/log-export";
import { getJobProjection, listJobRunProjections } from "@orbit/core/control/jobs";

function publicDestination(row: LogExportDestinationRow) {
  return {
    ...row,
    config: redactDestinationConfig(row.type, row.config),
    pendingRows: countCallLogsAfterRowId(row.cursorRowId),
  };
}

function validateConfig(typeId: string, config: Record<string, unknown>) {
  const type = getLogExportDestinationType(typeId);
  if (!type) throw new Error(`Unknown log export destination type "${typeId}"`);
  const parsed = type.configSchema.safeParse(config);
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  return parsed.data as Record<string, unknown>;
}

function secureConfig(type: string, config: Record<string, unknown>) {
  if (requiresEncryptionKey(type, config)) {
    throw new Error("STORAGE_ENCRYPTION_KEY is required before saving log export credentials");
  }
  return encryptDestinationConfig(type, config);
}

@Injectable()
export class LogExportService {
  list() { return getLogExportDestinations().map(publicDestination); }
  types() { return describeLogExportDestinationTypes(); }
  status() {
    const job = getJobProjection(LOG_EXPORT_JOB_ID);
    return {
      job: job ? { id: job.id, enabled: job.enabled, cron: job.cron, timezone: String(job.config?.timezone ?? "UTC") } : null,
      runs: listJobRunProjections(LOG_EXPORT_JOB_ID, 10),
      maxCallLogRowId: getMaxCallLogRowId(),
      destinations: this.list(),
    };
  }

  create(input: CreateLogExportDestinationInput) {
    const config = validateConfig(input.type, input.config);
    return publicDestination(createLogExportDestination({ ...input, config: secureConfig(input.type, config) }));
  }

  update(id: string, input: UpdateLogExportDestinationInput) {
    const stored = getLogExportDestination(id);
    if (!stored) return null;
    let config = stored.config;
    if (input.config) {
      const merged = mergeDestinationConfig(stored.type, stored.config, input.config);
      const plaintext = decryptDestinationConfig(stored.type, merged);
      config = secureConfig(stored.type, validateConfig(stored.type, plaintext));
    } else if (input.enabled && !stored.enabled) {
      validateConfig(stored.type, decryptDestinationConfig(stored.type, stored.config));
    }
    const updated = updateLogExportDestination(id, { ...input, config });
    return updated ? publicDestination(updated) : null;
  }

  delete(id: string) { return deleteLogExportDestination(id); }
  reset(id: string) {
    if (!getLogExportDestination(id)) return false;
    resetLogExportCursor(id);
    return true;
  }
  async test(id: string) {
    const row = getLogExportDestination(id);
    if (!row) return null;
    return createClientForDestination(row).test();
  }
  async run(id: string) { return runSingleLogExport(id); }
}
