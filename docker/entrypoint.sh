#!/bin/sh
# /srv holds the build for the root, ready at build time, so a read-only container needs nothing writable.
# Under a BASE_PATH the placeholder build in /app/dist is copied below /tmp and the path written in.
set -eu

base=$(printf %s "${BASE_PATH:-}" | sed 's#^/*##; s#/*$##')
case "$base" in
  *[!A-Za-z0-9._~/-]*) echo "BASE_PATH may only hold letters, digits and . _ ~ - /" >&2; exit 1 ;;
esac
[ -n "$base" ] && base="/$base"
export BASE_PATH="$base"

if [ -z "$base" ]; then
  export SITE_ROOT=/srv
else
  export SITE_ROOT=/tmp/faultline
  rm -rf "$SITE_ROOT"
  if ! cp -r /app/dist "$SITE_ROOT" 2>/dev/null; then
    echo "BASE_PATH needs a writable /tmp; on a read-only root filesystem, mount a tmpfs there" >&2
    exit 1
  fi
  /app/set-base.sh "$SITE_ROOT" "$base"
fi

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
