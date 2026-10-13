#!/bin/bash
# Prepares cloud sessions (routines): dependencies, the browser QA and design review drive, and the
# browser the end-to-end checks run in.
# Local sessions skip it.
set -e
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
pnpm install --frozen-lockfile
pnpm exec agent-browser install --with-deps
pnpm exec playwright install --with-deps --only-shell chromium
