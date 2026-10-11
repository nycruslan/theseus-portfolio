#!/bin/bash
# Installs dependencies at the start of cloud sessions (routines). Local sessions skip it.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
pnpm install --frozen-lockfile
