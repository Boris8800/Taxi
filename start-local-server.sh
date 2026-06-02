#!/usr/bin/env bash
set -euo pipefail

port="${PORT:-3000}"
attempts=0

while lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
	attempts=$((attempts + 1))
	if [[ "$attempts" -ge 20 ]]; then
		echo "No free port found after checking 20 ports starting at ${PORT:-3000}." >&2
		exit 1
	fi
	port=$((port + 1))
done

export PORT="$port"
echo "Starting static server on http://0.0.0.0:${PORT}"
exec node serve-static.js