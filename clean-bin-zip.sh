#!/usr/bin/env bash
#
# clean-bin-zip.sh — clean every Gradle project in the workspace, remove leftover build/bin/.gradle
# directories, then zip the whole workspace into a single archive for sharing.
#
# Steps:
#   1. Find every subproject that has a Gradle wrapper (./gradlew) and run `./gradlew clean` in it.
#   2. Force-remove any remaining build/.gradle/bin directories (IDE-generated `bin/` output, or
#      leftovers from a `clean` that failed/skipped a module) so the archive carries no build output.
#   3. Zip the workspace root into <workspace-name>-<yyyyMMdd-HHmmss>.zip, next to the workspace,
#      excluding .git, the generated zips themselves, and OS cruft (.DS_Store).
#
# Usage:
#   ./clean-bin-zip.sh                 # clean + zip (default)
#   ./clean-bin-zip.sh --no-clean      # skip the gradle clean step, only prune dirs + zip
#   ./clean-bin-zip.sh --output DIR    # write the zip into DIR instead of the parent directory
set -euo pipefail

cd "$(dirname "$0")"
WORKSPACE_DIR="$(pwd)"
WORKSPACE_NAME="$(basename "${WORKSPACE_DIR}")"

RUN_CLEAN=1
OUTPUT_DIR="$(dirname "${WORKSPACE_DIR}")"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-clean)
      RUN_CLEAN=0
      shift
      ;;
    --output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option '$1'. Usage: $0 [--no-clean] [--output DIR]" >&2
      exit 2
      ;;
  esac
done

echo "==> Workspace: ${WORKSPACE_DIR}"

# ---- 1. gradle clean in every subproject that has a wrapper ----
if [[ "${RUN_CLEAN}" -eq 1 ]]; then
  echo "==> Running './gradlew clean' in every Gradle project ..."
  while IFS= read -r -d '' wrapper; do
    project_dir="$(dirname "${wrapper}")"
    echo "    -> ${project_dir}"
    if ! ( cd "${project_dir}" && chmod +x ./gradlew && ./gradlew clean --no-daemon -q ); then
      echo "       WARNING: 'gradle clean' failed in ${project_dir} — continuing." >&2
    fi
  done < <(find "${WORKSPACE_DIR}" -type f -name "gradlew" -print0)
else
  echo "==> --no-clean set: skipping 'gradle clean' step."
fi

# ---- 2. force-remove any leftover build/.gradle/bin directories ----
echo "==> Removing leftover build/.gradle/bin directories ..."
while IFS= read -r -d '' dir; do
  echo "    -> ${dir}"
  rm -rf "${dir}"
done < <(find "${WORKSPACE_DIR}" -depth -type d \( -name "build" -o -name ".gradle" -o -name "bin" \) -print0)

# ---- 3. zip the workspace for sharing ----
STAMP="$(date +%Y%m%d-%H%M%S)"
ZIP_PATH="${OUTPUT_DIR}/${WORKSPACE_NAME}-${STAMP}.zip"
mkdir -p "${OUTPUT_DIR}"

echo "==> Zipping workspace -> ${ZIP_PATH}"
( cd "${WORKSPACE_DIR}/.." && zip -r -q "${ZIP_PATH}" "${WORKSPACE_NAME}" \
    -x "${WORKSPACE_NAME}/.git/*" \
    -x "*/.git/*" \
    -x "${WORKSPACE_NAME}/*.zip" \
    -x "*.DS_Store" )

echo "==> Done: ${ZIP_PATH} ($(du -h "${ZIP_PATH}" | cut -f1))"
