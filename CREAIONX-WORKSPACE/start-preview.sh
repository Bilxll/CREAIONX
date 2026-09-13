#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-5500}"
ROOT="/workspaces/CREAIONX/CREAIONX-WORKSPACE"
LOG="/tmp/creaionx-workspace-preview.log"

pkill -f "[p]ython3 -m http.server ${PORT}" 2>/dev/null || true
nohup python3 -m http.server "${PORT}" --bind 0.0.0.0 --directory "${ROOT}" >"${LOG}" 2>&1 &
PID=$!

sleep 1
if curl -fsI "http://127.0.0.1:${PORT}/apply.html" >/dev/null; then
  echo "CREAIONX WORKSPACE preview is running."
  echo "Port: ${PORT}"
  echo "Local test: http://127.0.0.1:${PORT}/apply.html"
  echo "PID: ${PID}"
else
  echo "Preview failed to start. Log: ${LOG}" >&2
  cat "${LOG}" >&2 || true
  exit 1
fi
