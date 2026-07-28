#!/usr/bin/env bash
# Batch re-encode every *.png under ./assets as PNG32 (8-bit RGBA), preserving alpha.
# Requires ImageMagick 7+ (`magick` on PATH). Install: brew install imagemagick
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:-$ROOT/assets}"
if ! command -v magick >/dev/null 2>&1; then
  echo "error: 'magick' not found. Install ImageMagick 7+, e.g.: brew install imagemagick" >&2
  exit 1
fi
fail=0
while IFS= read -r -d '' f; do
  tmp="${f}.__im__.tmp.$$"
  err="${f}.__im__.err.$$"
  if magick "$f" \
      -strip \
      -alpha set \
      -background none \
      -type TrueColorAlpha \
      -define "png:color-type=6" \
      -define "png:format=png32" \
      "PNG32:${tmp}" 2>"${err}"; then
    mv "${tmp}" "${f}"
    rm -f "${err}"
  else
    echo "FAILED: ${f}" >&2
    cat "${err}" >&2 || true
    rm -f "${tmp}" "${err}"
    fail=1
  fi
done < <(find "${DIR}" -type f \( -iname '*.png' \) -print0)
exit "${fail}"
