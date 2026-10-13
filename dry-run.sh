#!/usr/bin/env bash
#
# dry-run.sh — instantly stand up the whole stack for trying things out, either via the *.http
# files (try_query.http, publish_query.http) or visually in the browser:
#   1. Build the query_engine boot jar (incremental), then start a dockerized Postgres (seeded
#      with order_projection rows, see docker/init/01_order_projection.sql) and a dockerized
#      query_engine together via docker compose.
#   2. Install (if needed) and start the frontend-react dev server in the background, waiting
#      for it to respond, then open it in the default browser.
#
# query_engine runs in its own container (not a bare `java -jar` background process) specifically
# so you can manually verify it keeps no in-memory lifecycle state: with everything up, run
#   docker compose -f docker/docker-compose.yml stop query-engine
#   docker compose -f docker/docker-compose.yml start query-engine
# (or `docker stop/start query-engine-app`) while Postgres keeps running, and confirm the UI /
# .http requests still see the same drafts and published queries afterward -- see README.md
# "Verifying query_engine holds no in-memory state" for the full walkthrough.
#
# Everything is left running in the background so you can use the UI or fire requests from the
# .http files right away. Use ./stop.sh when you're done to tear everything down.
#
# Usage:
#   ./dry-run.sh                 # start Postgres + query_engine + frontend, open the browser
#   ./dry-run.sh --db-only       # just start Postgres (for manual testing against query_engine)
#   ./dry-run.sh --no-frontend   # start Postgres + query_engine only, skip the UI
#   ./dry-run.sh --no-open       # start everything but don't open the browser
#   ./dry-run.sh --rebuild       # clean ./gradlew build + docker image rebuild without cache
set -euo pipefail

cd "$(dirname "$0")"
WORKSPACE_DIR="$(pwd)"
ENGINE_DIR="${WORKSPACE_DIR}/query_engine"
FRONTEND_DIR="${WORKSPACE_DIR}/frontend-react"
COMPOSE_FILE="${WORKSPACE_DIR}/docker/docker-compose.yml"
ENGINE_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:5173"
FRONTEND_LOG="${WORKSPACE_DIR}/.dry-run-frontend.log"
FRONTEND_PID_FILE="${WORKSPACE_DIR}/.dry-run-frontend.pid"

DB_ONLY=0
REBUILD=0
NO_FRONTEND=0
NO_OPEN=0
for arg in "$@"; do
  case "$arg" in
    --db-only) DB_ONLY=1 ;;
    --rebuild) REBUILD=1 ;;
    --no-frontend) NO_FRONTEND=1 ;;
    --no-open) NO_OPEN=1 ;;
    *) echo "Unknown option '$arg'. Usage: $0 [--db-only] [--no-frontend] [--no-open] [--rebuild]" >&2; exit 2 ;;
  esac
done

compose() { docker compose -f "${COMPOSE_FILE}" "$@"; }

echo "==> Workspace: ${WORKSPACE_DIR}"

# ---- 1. start Postgres and wait for it to be healthy ----
echo "==> Starting dockerized Postgres (seeded with order_projection rows) ..."
compose up -d --wait postgres
echo "    -> Postgres is up on localhost:5432 (db=generic_query, user/pass=generic_query)"

if [[ "${DB_ONLY}" -eq 1 ]]; then
  echo "==> --db-only set: skipping query_engine."
  exit 0
fi

# ---- 2. build query_engine's boot jar ----
# Always run bootJar: Gradle's up-to-date check makes this a no-op when sources haven't changed,
# and it guarantees the jar matches the checked-out code. Skipping it whenever *a* jar existed
# meant a `git pull` left build/libs (gitignored) holding a jar from the previous code, which
# then got baked into the image and served instead of the pulled code.
echo "==> Building query_engine ..."
if [[ "${REBUILD}" -eq 1 ]]; then
  ( cd "${ENGINE_DIR}" && chmod +x ./gradlew && ./gradlew clean bootJar --no-daemon -q )
else
  ( cd "${ENGINE_DIR}" && chmod +x ./gradlew && ./gradlew bootJar --no-daemon -q )
fi

# ---- 3. build and start the query_engine container ----
# --build always rebuilds the image from the jar above (cheap, Docker layer cache) and recreates
# the container if the image changed. Plain `up -d` would keep reusing an existing image.
echo "==> Building/starting the query_engine container ..."
if [[ "${REBUILD}" -eq 1 ]]; then
  compose build --no-cache query-engine
fi
compose up -d --build query-engine

echo "==> Waiting for query_engine to come up on ${ENGINE_URL} ..."
READY=0
for _ in $(seq 1 40); do
  if curl -s -o /dev/null -w "" -X POST "${ENGINE_URL}/engine/list" -H "Content-Type: application/json" -d '{}'; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "${READY}" -ne 1 ]]; then
  echo "ERROR: query_engine did not come up in time. Last log lines:" >&2
  compose logs --tail 40 query-engine >&2 || true
  exit 1
fi

echo "    -> query_engine is up (container query-engine-app), logs: docker compose -f ${COMPOSE_FILE} logs -f query-engine"

if [[ "${NO_FRONTEND}" -eq 1 ]]; then
  echo
  echo "Ready. Try the .http files now:"
  echo "  - publish_query.http  (Phase 1: draft/drafted/simulate/publish/discard/list)"
  echo "  - try_query.http      (Phase 2: /data-query)"
  echo
  echo "Run ./stop.sh when you're done to stop query_engine and the Postgres container."
  exit 0
fi

# ---- 5. start the frontend dev server (reuse if already running) ----
if [[ -f "${FRONTEND_PID_FILE}" ]] && kill -0 "$(cat "${FRONTEND_PID_FILE}")" 2>/dev/null; then
  echo "==> frontend-react is already running (pid $(cat "${FRONTEND_PID_FILE}")) -- reusing it."
else
  rm -f "${FRONTEND_PID_FILE}"

  if [[ ! -d "${FRONTEND_DIR}/node_modules" ]]; then
    echo "==> Installing frontend-react dependencies ..."
    ( cd "${FRONTEND_DIR}" && npm install )
  fi

  echo "==> Starting frontend-react (Vite dev server) ..."
  ( cd "${FRONTEND_DIR}" && npm run dev > "${FRONTEND_LOG}" 2>&1 & echo $! > "${FRONTEND_PID_FILE}" )

  echo "==> Waiting for frontend-react to come up on ${FRONTEND_URL} ..."
  FRONTEND_READY=0
  for _ in $(seq 1 40); do
    if curl -s -o /dev/null "${FRONTEND_URL}"; then
      FRONTEND_READY=1
      break
    fi
    sleep 1
  done

  if [[ "${FRONTEND_READY}" -ne 1 ]]; then
    echo "ERROR: frontend-react did not come up in time. Last log lines:" >&2
    tail -n 40 "${FRONTEND_LOG}" >&2 || true
    exit 1
  fi
  echo "    -> frontend-react is up (pid $(cat "${FRONTEND_PID_FILE}")), log: ${FRONTEND_LOG}"
fi

# ---- 6. open the UI in the default browser ----
if [[ "${NO_OPEN}" -eq 0 ]]; then
  echo "==> Opening ${FRONTEND_URL} in your browser ..."
  if command -v open >/dev/null 2>&1; then
    open "${FRONTEND_URL}"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${FRONTEND_URL}"
  else
    echo "    (could not detect a way to open a browser automatically -- open it yourself)"
  fi
fi

echo
echo "Ready:"
echo "  - UI:              ${FRONTEND_URL}  (Query Builder + Query List + Run Query)"
echo "  - query_engine:    ${ENGINE_URL}  (container: query-engine-app)"
echo "  - .http files:     publish_query.http (Phase 1), try_query.http (Phase 2)"
echo
echo "To manually verify query_engine keeps no in-memory state: draft/publish something, then"
echo "  docker compose -f ${COMPOSE_FILE} stop query-engine"
echo "  docker compose -f ${COMPOSE_FILE} start query-engine"
echo "and confirm the same drafts/published queries are still there (Postgres never restarted)."
echo
echo "Run ./stop.sh when you're done to stop everything (frontend, query_engine, Postgres)."
