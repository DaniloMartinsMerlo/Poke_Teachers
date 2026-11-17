#!/usr/bin/env bash
# Roda tests/e2e/check.js dentro da cena real, no Chrome headless.
# Uso: npm run test:e2e   (precisa de google-chrome e python3; usa internet
# para baixar A-Frame e cannon.js da CDN)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${E2E_PORT:-8765}"
WORK="$(mktemp -d)"
trap 'kill "${SERVER_PID:-}" 2>/dev/null || true; rm -rf "$WORK"' EXIT

mkdir -p "$WORK/www"
ln -s "$ROOT/site/src" "$WORK/www/src"
ln -s "$ROOT/site/assets" "$WORK/www/assets"
cp "$ROOT/tests/e2e/check.js" "$WORK/www/check.js"
sed 's#</body>#<script type="module" src="check.js"></script></body>#' \
  "$ROOT/site/index.html" > "$WORK/www/index.html"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK/www" >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1

timeout 120 google-chrome --headless=new --enable-unsafe-swiftshader --use-angle=swiftshader \
  --user-data-dir="$WORK/chrome" --virtual-time-budget=90000 \
  --dump-dom "http://127.0.0.1:$PORT/" 2>/dev/null > "$WORK/dom.html"

RESULT="$(grep -o '<pre id="e2e">[^<]*</pre>' "$WORK/dom.html" | sed 's/<[^>]*>//g;s/&quot;/"/g' || true)"
if [ -z "$RESULT" ]; then
  echo "Sem resultado. Etapas alcançadas:"
  grep -o '<pre id="e2e-step">[^<]*</pre>' "$WORK/dom.html" || echo "(nenhuma)"
  exit 1
fi
echo "$RESULT" | python3 -m json.tool
