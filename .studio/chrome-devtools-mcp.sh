#!/bin/bash
# Starts Chrome DevTools MCP (.mcp.json): performance traces, Lighthouse and accessibility audits
# for Pixel, Iris and Probe (the chrome-devtools, debug-optimize-lcp and a11y-debugging skills).
# Headless, in a throwaway profile, without usage statistics or CrUX lookups. A cloud session has
# no installed Chrome, so it drives the image's Chromium, the one agent-browser uses (install.sh);
# a local session drives the stable Chrome. The version is pinned, as next-devtools-mcp's is.
args=(--headless --isolated --no-usage-statistics --performanceCrux=false)
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  build=$(ls -d "${THESEUS_BROWSERS_IMAGE:-/opt/pw-browsers}"/chromium-*/ 2>/dev/null | sort -V | tail -n 1)
  chrome=$(find "${build:-/nonexistent}" -maxdepth 2 -name chrome -type f 2>/dev/null | head -n 1)
  [ -n "$chrome" ] && args+=(--executablePath "$chrome")
fi
exec npx -y chrome-devtools-mcp@1.11.0 "${args[@]}"
