#!/bin/bash
# Prepares cloud sessions (routines): dependencies, plus the browser QA and design review drive.
# Local sessions skip it.
set -e
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
pnpm install --frozen-lockfile
pnpm exec agent-browser install --with-deps
