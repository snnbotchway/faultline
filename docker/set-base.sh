#!/bin/sh
# Writes a base path into a build made with the placeholder base (vite.config.ts).
# Usage: set-base.sh <directory> <base>, where base is '' for the root or `/some/path`.
set -eu
find "$1" -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' -o -name '*.txt' \) \
  -exec sed -i "s#/__FAULTLINE_BASE__/#$2/#g" {} +
