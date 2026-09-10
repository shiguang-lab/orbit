#!/usr/bin/env bash
# Run tests for workspace packages touched by the current change.
# Usage: pnpm test:scoped [--staged]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STAGED=false

for arg in "$@"; do
  case "$arg" in
    --staged) STAGED=true ;;
    --full) ;; # Kept as an alias: package discovery is live and needs no generated map.
    -h|--help) sed -n '2,3p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "[test:scoped] unknown argument: $arg (use --staged)"; exit 2 ;;
  esac
done

if [ "$STAGED" = true ]; then
  CHANGED="$(git -C "$REPO_ROOT" diff --name-only --diff-filter=ACMR --cached)"
else
  CHANGED="$(git -C "$REPO_ROOT" diff --name-only --diff-filter=ACMR HEAD~1...HEAD 2>/dev/null || git -C "$REPO_ROOT" diff --name-only --diff-filter=ACMR)"
fi

if [ -z "$CHANGED" ]; then
  echo "[test:scoped] No changed files — nothing to test."
  exit 0
fi

if printf '%s\n' "$CHANGED" | grep -Eq '^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|turbo\.json|tsconfig[^/]*\.json)$'; then
  echo "[test:scoped] Workspace hub changed — running every package test script."
  exec pnpm -C "$REPO_ROOT" -r --if-present test
fi

PACKAGES=""
while IFS= read -r file; do
  case "$file" in
    apps/*/*|packages/*/*)
      package_dir="$(printf '%s' "$file" | cut -d/ -f1-2)"
      manifest="$REPO_ROOT/$package_dir/package.json"
      if [ -f "$manifest" ]; then
        name="$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).name" "$manifest")"
        PACKAGES="${PACKAGES}${name}\n"
      fi
      ;;
  esac
done <<EOF
$CHANGED
EOF

PACKAGES="$(printf '%b' "$PACKAGES" | sed '/^$/d' | sort -u)"
if [ -z "$PACKAGES" ]; then
  echo "[test:scoped] No changed workspace package has a test script."
  exit 0
fi

FILTERS=""
while IFS= read -r name; do FILTERS="$FILTERS --filter $name"; done <<EOF
$PACKAGES
EOF

echo "[test:scoped] Running tests for: $(printf '%s' "$PACKAGES" | tr '\n' ' ')"
# Package names come from local package.json files, not user input.
# shellcheck disable=SC2086
exec pnpm -C "$REPO_ROOT" $FILTERS --if-present test
