#!/usr/bin/env bash
# Roll a split ShiguangGateway Docker Compose deployment to one published image family.
set -euo pipefail
SCRIPT_NAME="rollback"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_ops-common.sh"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

usage() {
  cat <<'EOF'
Usage: scripts/ops/rollback.sh <release-tag> [--compose-file <path>]
       [--image-prefix <registry/repository-prefix>] [--yes|-y] [-h|--help]

Pins all six split images to the same published release tag, pulls them, and
recreates the active console, gateway, control, realtime, and worker services with
docker-compose.yml. The migration-profile importer image is pulled but not started.
The image variables apply to this invocation only; set the same six values in
.env before a later manual `docker compose up`.

Defaults:
  --compose-file  ./docker-compose.yml
  --image-prefix  ghcr.io/shiguang-lab/shiguang-gateway

Examples:
  scripts/ops/rollback.sh v3.8.50
EOF
}

RELEASE_REF=""
COMPOSE_FILE="${SHIGUANG_GATEWAY_COMPOSE_FILE:-$REPO_ROOT/docker-compose.yml}"
IMAGE_PREFIX="${SHIGUANG_GATEWAY_IMAGE_PREFIX:-ghcr.io/shiguang-lab/shiguang-gateway}"

while [ $# -gt 0 ]; do
  case "$1" in
    --yes | -y) ASSUME_YES=1; shift ;;
    --compose-file) COMPOSE_FILE="${2:?--compose-file needs a path}"; shift 2 ;;
    --image-prefix) IMAGE_PREFIX="${2:?--image-prefix needs a value}"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    -*) ops_die "unknown argument: $1 (see --help)" ;;
    *)
      [ -z "$RELEASE_REF" ] || ops_die "only one release tag may be specified"
      RELEASE_REF="$1"
      shift
      ;;
  esac
done

[ -n "$RELEASE_REF" ] || ops_die "release tag required (see --help)"
[ -f "$COMPOSE_FILE" ] || ops_die "compose file not found: $COMPOSE_FILE"
case "$RELEASE_REF" in
  *[!A-Za-z0-9._-]* | "") ops_die "invalid image tag: $RELEASE_REF" ;;
  *) IMAGE_SUFFIX=":$RELEASE_REF" ;;
esac

export SHIGUANG_GATEWAY_CONSOLE_IMAGE="${IMAGE_PREFIX}-console${IMAGE_SUFFIX}"
export SHIGUANG_GATEWAY_GATEWAY_IMAGE="${IMAGE_PREFIX}-gateway${IMAGE_SUFFIX}"
export SHIGUANG_GATEWAY_CONTROL_IMAGE="${IMAGE_PREFIX}-control${IMAGE_SUFFIX}"
export SHIGUANG_GATEWAY_REALTIME_IMAGE="${IMAGE_PREFIX}-realtime${IMAGE_SUFFIX}"
export SHIGUANG_GATEWAY_WORKER_IMAGE="${IMAGE_PREFIX}-worker${IMAGE_SUFFIX}"
export SHIGUANG_GATEWAY_IMPORTER_IMAGE="${IMAGE_PREFIX}-importer${IMAGE_SUFFIX}"

ops_require_cmd docker
docker compose -f "$COMPOSE_FILE" --profile migration config >/dev/null
ops_log "compose: $COMPOSE_FILE"
ops_log "image family: ${IMAGE_PREFIX}-{console,gateway,control,realtime,worker,importer}${IMAGE_SUFFIX}"
ops_confirm "Pull and recreate the split deployment at $RELEASE_REF?" || ops_die "aborted"

docker compose -f "$COMPOSE_FILE" --profile migration pull
docker compose -f "$COMPOSE_FILE" up -d --no-build
ops_log "split deployment rolled back to $RELEASE_REF"
ops_log "persist this tag in the six SHIGUANG_GATEWAY_*_IMAGE entries before future compose runs"
