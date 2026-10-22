#!/bin/bash
# Prepares cloud sessions (routines): dependencies, the browser the end-to-end checks run in, and
# the browser agent-browser drives for QA and design review. Local sessions skip it.
#
# Every step is best effort, and the script always exits 0: one blocked download must not skip the
# rest. The end-to-end checks run in the headless Chromium build CI runs: the one the environment's
# setup script downloaded, else the image's own (/opt/pw-browsers) when it's that build, else a
# fresh download, which the environment's network access allows. A step that fails says so here,
# and again when the tool that needed it runs.
#
# Settings reach the session's later commands through CLAUDE_ENV_FILE, which Claude Code gives
# SessionStart hooks.

[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Overridable for the harness tests only.
IMAGE="${THESEUS_BROWSERS_IMAGE:-/opt/pw-browsers}"

say() { echo "install.sh: $*" >&2; }

# Sets a variable for the rest of this script and for every later command in the session.
persist() {
  export "$1=$2"
  if [ -n "$CLAUDE_ENV_FILE" ]; then
    printf 'export %s=%q\n' "$1" "$2" >>"$CLAUDE_ENV_FILE"
  fi
}

# Clears a variable here and for every later command, so a value the session started with (say,
# PLAYWRIGHT_BROWSERS_PATH at an image without the wanted build) doesn't outlive this decision.
forget() {
  unset "$1"
  if [ -n "$CLAUDE_ENV_FILE" ]; then
    printf 'unset %s\n' "$1" >>"$CLAUDE_ENV_FILE"
  fi
}

# Where this Playwright looks for its headless Chromium under $PLAYWRIGHT_BROWSERS_PATH, such as
# .../chromium_headless_shell-1248. A dry run only prints, so it needs no network.
wanted_shell() {
  pnpm exec playwright install --dry-run --only-shell chromium 2>/dev/null |
    sed -n 's/^ *Install location: *//p' | head -n 1
}

# Downloads the build this Playwright wants into its own cache, never into the image, whatever
# PLAYWRIGHT_BROWSERS_PATH points at; true once it's there.
download_shell() {
  (
    unset PLAYWRIGHT_BROWSERS_PATH
    pnpm exec playwright install --only-shell chromium >/dev/null 2>&1 && [ -d "$(wanted_shell)" ]
  ) || return 1
  [ -n "$PLAYWRIGHT_BROWSERS_PATH" ] && forget PLAYWRIGHT_BROWSERS_PATH
  return 0
}

playwright_browser() {
  local want
  # A session started under an older install.sh may still point at the browser shim it built, which
  # holds an older Chromium than CI's: look in Playwright's own cache again.
  case "$PLAYWRIGHT_BROWSERS_PATH" in */theseus-browsers) forget PLAYWRIGHT_BROWSERS_PATH ;; esac
  want=$(wanted_shell)
  if [ -n "$want" ] && [ -d "$want" ]; then
    say "Playwright uses its own download ($want)."
    return
  fi
  want=$(PLAYWRIGHT_BROWSERS_PATH="$IMAGE" wanted_shell)
  if [ -n "$want" ] && [ -d "$want" ]; then
    persist PLAYWRIGHT_BROWSERS_PATH "$IMAGE"
    say "Playwright uses the image's browsers ($want)."
    return
  fi
  if download_shell; then
    say "Playwright downloaded the build CI runs ($(wanted_shell))."
  else
    say "Couldn't download Playwright's Chromium, so the end-to-end checks can't run here. The environment's network access must allow cdn.playwright.dev and playwright.download.prss.microsoft.com."
  fi
  # The image's browsers came with their system libraries; without them, they need apt and root.
  [ -d "$IMAGE" ] || pnpm exec playwright install-deps chromium >/dev/null 2>&1 ||
    say "Couldn't install Chromium's system libraries."
}

agent_browser() {
  local build exe
  build=$(ls -d "$IMAGE"/chromium-*/ 2>/dev/null | sort -V | tail -n 1)
  exe=$(find "${build:-/nonexistent}" -maxdepth 2 -name chrome -type f 2>/dev/null | head -n 1)
  if [ -n "$exe" ]; then
    persist AGENT_BROWSER_EXECUTABLE_PATH "$exe"
    say "agent-browser uses the image's Chromium ($exe)."
    return
  fi
  pnpm exec agent-browser install ||
    say "Couldn't download agent-browser's Chrome: check the site with Playwright instead."
}

pnpm install --frozen-lockfile --prefer-offline ||
  say "pnpm install failed: pnpm verify and the end-to-end checks will fail until it's run."
# Tools the skills call by name, such as agent-browser, are the project's own packages. Only the
# project's folder is added: each later command keeps the rest of its own PATH.
export PATH="$PWD/node_modules/.bin:$PATH"
if [ -n "$CLAUDE_ENV_FILE" ]; then
  printf 'export PATH=%q:"$PATH"\n' "$PWD/node_modules/.bin" >>"$CLAUDE_ENV_FILE"
fi
# Commits format what they stage (.githooks/pre-commit), so a push never fails CI on formatting.
git config core.hooksPath .githooks 2>/dev/null ||
  say "Couldn't point git at .githooks: commits won't format what they stage."
playwright_browser
agent_browser
exit 0
