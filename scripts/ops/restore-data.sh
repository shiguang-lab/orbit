#!/usr/bin/env bash
# scripts/ops/restore-data.sh — restore the ShiguangGateway SQLite data from a snapshot
# created by scripts/ops/snapshot-data.sh. Used by the data-layer incident-recovery
# flow after stopping writers.
#
# Safety: takes a pre-restore snapshot of the CURRENT data, refuses to run
# unattended without --yes, and verifies the snapshot before overwriting.
set -euo pipefail
SCRIPT_NAME="restore-data"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_ops-common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/ops/restore-data.sh <snapshot-id> [--data-dir <path>] [--yes|-y] [-h|--help]

Restores storage.sqlite (and any sibling *.sqlite) from a snapshot. The current
data is first copied to $DB_BACKUPS_DIR/pre-restore_<UTC> as a safety net.
<snapshot-id> is a timestamp/sha, a snapshot dir name, or a path (see snapshot-data.sh).
Stop every split service that mounts this data directory before running, and restart them afterwards.
For Docker Compose, --data-dir must name a host path where the stopped data volume is mounted.
EOF
}

ID=""
while [ $# -gt 0 ]; do
  case "$1" in
    --yes | -y) ASSUME_YES=1; shift ;;
    --data-dir) ops_set_data_dir "${2:?--data-dir needs a value}"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    -*) ops_die "unknown argument: $1 (see --help)" ;;
    *) ID="$1"; shift ;;
  esac
done

[ -n "$ID" ] || ops_die "snapshot id required (see --help)"
snap="$(ops_find_snapshot "$ID")"
ops_log "restore source: $snap → $SHIGUANG_GATEWAY_DATA_DIR"
ops_confirm "Overwrite storage.sqlite at $SHIGUANG_GATEWAY_DATA_DIR from $snap?" || ops_die "aborted"

# Pre-restore safety copy of the live data.
if [ -f "$SHIGUANG_GATEWAY_SQLITE" ]; then
  safety="$SHIGUANG_GATEWAY_BACKUPS_DIR/pre-restore_$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$safety"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$SHIGUANG_GATEWAY_SQLITE" "VACUUM INTO '$safety/storage.sqlite'" \
      || cp -a "$SHIGUANG_GATEWAY_SQLITE" "$safety/storage.sqlite"
  else
    cp -a "$SHIGUANG_GATEWAY_SQLITE" "$safety/storage.sqlite"
  fi
  ops_log "current data saved to $safety"
fi

mkdir -p "$SHIGUANG_GATEWAY_DATA_DIR"
# Drop stale WAL/SHM so the restored DB is authoritative, then copy in.
rm -f "$SHIGUANG_GATEWAY_SQLITE" "${SHIGUANG_GATEWAY_SQLITE}-wal" "${SHIGUANG_GATEWAY_SQLITE}-shm"
cp -a "$snap/storage.sqlite" "$SHIGUANG_GATEWAY_SQLITE"

# Restore sibling DBs captured in the snapshot.
for f in "$snap"/*.sqlite; do
  [ -e "$f" ] || continue
  [ "$(basename "$f")" = "storage.sqlite" ] && continue
  cp -a "$f" "$SHIGUANG_GATEWAY_DATA_DIR/"
done

ops_log "restore complete — restart ShiguangGateway to pick up the restored data"
