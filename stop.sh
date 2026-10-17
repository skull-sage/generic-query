#!/usr/bin/env bash
#
# stop.sh — tears down everything dry-run.sh started:
#   1. Stops the Query Builder UI dev server: the one dry-run.sh started (its whole process
#      group) plus any other dev server of this UI still running, e.g. one started by hand with
#      `npm run dev` or left over from an earlier run. Other projects' processes aren't touched.
#      See scripts/ui-dev-server.sh.
#   2. Stops and removes each domain's docker compose stack (service + Postgres) along with its
#      database volume, so the next ./dry-run.sh starts from freshly seeded data.
#
# Safe to run when nothing is up -- every step is a no-op then.
#
# Usage:
#   ./stop.sh
set -euo pipefail

cd "$(dirname "$0")"
WORKSPACE_DIR="$(pwd)"
UI_DIR="${WORKSPACE_DIR}/query-builder-ui"
UI_PORT=5173
UI_LOG="${WORKSPACE_DIR}/.dry-run-frontend.log"
UI_PID_FILE="${WORKSPACE_DIR}/.dry-run-frontend.pid"
# shellcheck source=scripts/ui-dev-server.sh
source "${WORKSPACE_DIR}/scripts/ui-dev-server.sh"

echo "==> Workspace: ${WORKSPACE_DIR}"

# ---- 1. stop the UI ----
ui_stop_all
rm -f "${UI_LOG}"

remaining="$(ui_find_ours)"
if [[ -n "${remaining}" ]]; then
  echo "WARNING: these query-builder-ui processes are still running:" >&2
  for pid in ${remaining}; do ps -o pid=,command= -p "${pid}" >&2 || true; done
fi

# ---- 2. stop each domain stack ----
if ! docker info >/dev/null 2>&1; then
  echo "==> Docker isn't running -- no containers to stop."
  exit 0
fi

for service in order-query inventory-query; do
  echo "==> Stopping ${service} stack ..."
  docker compose -f "${WORKSPACE_DIR}/${service}/docker/docker-compose.yml" down -v --remove-orphans
done

# Containers from the old single-service layout (one shared query_engine), if any are left over.
docker rm -f -v query-engine-app query-engine-postgres >/dev/null 2>&1 || true

echo "==> Done. Everything stopped and removed."
