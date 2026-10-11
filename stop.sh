#!/usr/bin/env bash
#
# stop.sh — tears down everything dry-run.sh started:
#   1. Stops the backgrounded frontend-react dev server (if running).
#   2. Stops and removes the dockerized query_engine and Postgres containers
#      (docker compose down).
#
# Safe to run even if nothing is up -- each step is a no-op if there's nothing to stop.
#
# Usage:
#   ./stop.sh
set -euo pipefail

cd "$(dirname "$0")"
WORKSPACE_DIR="$(pwd)"
COMPOSE_FILE="${WORKSPACE_DIR}/docker/docker-compose.yml"
FRONTEND_LOG="${WORKSPACE_DIR}/.dry-run-frontend.log"
FRONTEND_PID_FILE="${WORKSPACE_DIR}/.dry-run-frontend.pid"

echo "==> Workspace: ${WORKSPACE_DIR}"

stop_pid_file() {
  local name="$1" pid_file="$2" log_file="$3"
  if [[ -f "${pid_file}" ]]; then
    local pid
    pid="$(cat "${pid_file}")"
    if kill -0 "${pid}" 2>/dev/null; then
      echo "==> Stopping ${name} (pid ${pid}) ..."
      kill "${pid}" 2>/dev/null || true
      wait "${pid}" 2>/dev/null || true
    else
      echo "==> ${name} pid file found but process ${pid} isn't running."
    fi
    rm -f "${pid_file}"
  else
    echo "==> No ${name} pid file -- nothing to stop."
  fi
  rm -f "${log_file}"
}

# ---- 1. stop frontend-react ----
stop_pid_file "frontend-react" "${FRONTEND_PID_FILE}" "${FRONTEND_LOG}"

# ---- 2. stop and remove the query_engine and Postgres containers ----
echo "==> Stopping query_engine and Postgres containers ..."
docker compose -f "${COMPOSE_FILE}" down

echo "==> Done. Everything stopped and removed."
