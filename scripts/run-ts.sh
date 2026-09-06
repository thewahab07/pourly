#!/usr/bin/env bash
# Compiles a TypeScript dev script (plus the engine it imports) to CommonJS in a
# temp directory and runs it with Node. Keeps dev tooling out of the app bundle.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: scripts/run-ts.sh <script.ts> [args...]" >&2
  exit 1
fi

ENTRY="$1"
shift

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$(mktemp -d "${TMPDIR:-/tmp}/lcs-build-XXXXXX")"
trap 'rm -rf "$OUT"' EXIT

npx tsc --ignoreConfig \
  "$ROOT/src/engine/types.ts" \
  "$ROOT/src/engine/engine.ts" \
  "$ROOT/src/engine/solver.ts" \
  "$ROOT/src/levels/levels.ts" \
  "$ROOT/$ENTRY" \
  --rootDir "$ROOT" \
  --outDir "$OUT" \
  --module commonjs \
  --moduleResolution node10 \
  --ignoreDeprecations 6.0 \
  --target es2022 \
  --strict \
  --types node \
  --skipLibCheck

node "$OUT/${ENTRY%.ts}.js" "$@"
