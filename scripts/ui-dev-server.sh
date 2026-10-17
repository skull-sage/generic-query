# shellcheck shell=bash
#
# Lifecycle of the Query Builder UI dev server (Vite), shared by dry-run.sh and stop.sh.
# Source it; don't run it. Works with macOS's bash 3.2.
#
# Why this exists: stopping the dev server by a single PID left strays behind. `npm run dev`
# runs as npm -> sh -> node vite, and killing npm doesn't reliably kill vite, which then keeps
# port 5173. Dev servers started by hand (npm run dev in a terminal or the IDE) weren't tracked
# at all. So:
#   - The server is started in its own process group, and stopped by killing the whole group
#     (TERM, then KILL after a grace period).
#   - vite is run directly from node_modules/.bin, without the npm and sh layers in between.
#   - Stopping also sweeps any dev server that belongs to this UI but isn't tracked: anything
#     listening on the dev ports, or any vite process, whose working directory is the UI
#     directory. Processes of other projects are never touched.
#   - The PID file is trusted only if that PID is still one of our dev servers, so a reused PID
#     can't make us kill an unrelated process.
#
# Expects before sourcing: UI_DIR (the query-builder-ui directory), UI_PORT, UI_PID_FILE, UI_LOG.

# Ports an older non-strict dev server may have moved to when 5173 was taken.
UI_SWEEP_PORTS="${UI_SWEEP_PORTS:-5173 5174 5175 5176 5177 5178 5179}"
UI_STOP_GRACE_SECONDS="${UI_STOP_GRACE_SECONDS:-5}"

UI_DIR_REAL="$(cd "${UI_DIR}" && pwd -P)"

_ui_cwd_of() {
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1
}

_ui_pgid_of() {
  ps -o pgid= -p "$1" 2>/dev/null | tr -d ' '
}

_ui_cmd_of() {
  ps -o command= -p "$1" 2>/dev/null
}

# True when PID is a process of this UI: its working directory is the UI directory (or below).
_ui_is_ours() {
  local cwd
  cwd="$(_ui_cwd_of "$1")"
  [[ -n "${cwd}" && ( "${cwd}" == "${UI_DIR_REAL}" || "${cwd}" == "${UI_DIR_REAL}/"* ) ]]
}

# PID of the tracked dev server, or nothing when the PID file is missing, dead or reused.
ui_tracked_pid() {
  [[ -f "${UI_PID_FILE}" ]] || return 0
  local pid
  pid="$(tr -cd '0-9' < "${UI_PID_FILE}")"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null && _ui_is_ours "${pid}"; then
    echo "${pid}"
  fi
}

# Dev servers of this UI that are running, tracked or not: listeners on the dev ports and vite
# processes, whose working directory is the UI directory. One PID per line, deduplicated.
ui_find_ours() {
  local port pid
  {
    for port in ${UI_SWEEP_PORTS}; do
      lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
    done
    pgrep -f 'node_modules/.bin/vite|/vite/bin/vite\.js|npm run dev' 2>/dev/null || true
  } | sort -un | while read -r pid; do
    [[ -n "${pid}" && "${pid}" != "$$" ]] && _ui_is_ours "${pid}" && echo "${pid}"
  done
  return 0
}

# PID listening on UI_PORT that is NOT ours (another project's server), if any.
ui_foreign_listener() {
  local pid
  for pid in $(lsof -nP -tiTCP:"${UI_PORT}" -sTCP:LISTEN 2>/dev/null || true); do
    if ! _ui_is_ours "${pid}"; then
      echo "${pid}"
      return 0
    fi
  done
  return 0
}

# Stops the process group PID belongs to: TERM, wait up to the grace period, then KILL.
# Never signals this script's own group. Falls back to the single PID when the group is
# unknown or is ours.
_ui_kill_group() {
  local pid="$1" pgid own_pgid target waited
  pgid="$(_ui_pgid_of "${pid}")"
  own_pgid="$(_ui_pgid_of $$)"
  if [[ -n "${pgid}" && "${pgid}" != "${own_pgid}" ]]; then
    target="-${pgid}"
  else
    target="${pid}"
  fi

  kill -TERM -- "${target}" 2>/dev/null || return 0
  waited=0
  while kill -0 -- "${target}" 2>/dev/null && [[ "${waited}" -lt $((UI_STOP_GRACE_SECONDS * 10)) ]]; do
    sleep 0.1
    waited=$((waited + 1))
  done
  if kill -0 -- "${target}" 2>/dev/null; then
    echo "    -> still running after ${UI_STOP_GRACE_SECONDS}s, forcing it (KILL)"
    kill -KILL -- "${target}" 2>/dev/null || true
    sleep 0.2
  fi
}

# Stops every dev server of this UI (tracked or stray) and removes the PID file.
# Prints what it stopped. Safe to call when nothing is running.
ui_stop_all() {
  local pids pid stopped=0
  pids="$( { ui_tracked_pid; ui_find_ours; } | sort -un )"
  for pid in ${pids}; do
    # An earlier group kill may already have taken this one down.
    kill -0 "${pid}" 2>/dev/null || continue
    echo "==> Stopping query-builder-ui dev server (pid ${pid}, group $(_ui_pgid_of "${pid}")): $(_ui_cmd_of "${pid}" | cut -c1-100)"
    _ui_kill_group "${pid}"
    stopped=$((stopped + 1))
  done
  rm -f "${UI_PID_FILE}"
  if [[ "${stopped}" -eq 0 ]]; then
    echo "==> No query-builder-ui dev server running."
  fi
  return 0
}

# Starts vite in its own process group, in the background, logging to UI_LOG. The PID written
# to UI_PID_FILE is also the process group id.
ui_start() {
  local launcher
  if command -v setsid >/dev/null 2>&1; then
    launcher=(setsid)
  else
    # macOS has no setsid; perl ships with it. setpgrp(0,0) makes this process a group leader,
    # then exec keeps the same PID for vite.
    launcher=(perl -e 'setpgrp(0, 0) or die "setpgrp: $!\n"; exec @ARGV or die "exec: $!\n"')
  fi
  (
    cd "${UI_DIR}"
    exec "${launcher[@]}" ./node_modules/.bin/vite --port "${UI_PORT}" --strictPort
  ) </dev/null >"${UI_LOG}" 2>&1 &
  echo $! > "${UI_PID_FILE}"
}
