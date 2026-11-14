#!/bin/sh
# Serves the build under BASE_PATH (empty for the root). The build carries a placeholder base, so each start
# copies it and writes the real path in, and Caddy mounts the app and the backend paths at the same prefix.
set -eu

base=$(printf %s "${BASE_PATH:-}" | sed 's#^/*##; s#/*$##')
case "$base" in
  *[!A-Za-z0-9._~/-]*) echo "BASE_PATH may only hold letters, digits and . _ ~ - /" >&2; exit 1 ;;
esac
[ -n "$base" ] && base="/$base"
export BASE_PATH="$base"

rm -rf /tmp/srv
cp -r /app/dist /tmp/srv
find /tmp/srv -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' -o -name '*.txt' \) \
  -exec sed -i "s#/__FAULTLINE_BASE__/#${base}/#g" {} +

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
