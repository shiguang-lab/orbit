# Continuous call-log export

Orbit can continuously export call logs to external analytics storage. Google BigQuery is the first destination; the destination registry keeps persistence, scheduling, and the console independent of a specific vendor.

Open **Monitoring → Continuous log export** to add a destination. New destinations and request/response body export are disabled by default. Summary fields are exported on the schedule only after the destination is explicitly enabled.

## BigQuery setup

Create a Google service account with permission to read the target dataset and insert rows. If automatic creation is enabled, it also needs permission to create the dataset and table. Paste the complete service-account JSON into the destination form.

`STORAGE_ENCRYPTION_KEY` must be configured before credentials can be saved. Credentials are encrypted at rest and API responses return only a stored-secret placeholder. Keep the encryption key stable across restarts and backups.

The generated table is partitioned daily by `timestamp` and clustered by API key name, provider, model, and status. Each streamed row uses the call-log ID as its BigQuery `insertId`, allowing safe retry de-duplication.

## Delivery behavior

- The default schedule is `0 * * * *` (hourly, UTC). Override it with `ORBIT_LOG_EXPORT_CRON`.
- Each destination owns a durable SQLite row cursor. The cursor advances only after the destination accepts a full batch.
- Transient BigQuery failures are retried. HTTP 200 responses containing row errors fail the batch and retain the cursor.
- Requests are split at 500 rows or approximately 9 MiB, whichever comes first.
- Purged or replaced call-log databases reset an out-of-range cursor safely.
- Enabling body export hydrates request, response, and pipeline artifacts and truncates each field to the configured byte limit. Treat this option as sensitive-data export.

The console exposes connection testing, on-demand runs, backlog counts, recent scheduled runs, destination errors, and an explicit cursor reset for intentional re-export.
