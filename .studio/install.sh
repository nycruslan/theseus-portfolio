#!/bin/bash
# Prepares cloud sessions (routines): dependencies, the browser the end-to-end checks run in, and
# the browser agent-browser drives for QA and design review. Local sessions skip it.
#
# Every step is best effort, and the script always exits 0: one blocked download must not skip the
# rest. The cloud's proxy refuses Playwright's and agent-browser's browser downloads, so the image's
# own browsers in /opt/pw-browsers come first. When the image's Chromium is an older build than the
# one this Playwright wants, a folder of links (the shim) presents it under the wanted build's
# name; every agent in sprints 1 and 2 built that shim by hand. A step that fails says so here,
# and again when the tool that needed it runs.
#
# Settings reach the session's later commands through CLAUDE_ENV_FILE, which Claude Code gives
# SessionStart hooks.

[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Overridable for the harness tests only.
IMAGE="${THESEUS_BROWSERS_IMAGE:-/opt/pw-browsers}"
SHIM="${THESEUS_BROWSERS_SHIM:-$HOME/.cache/theseus-browsers}"

say() { echo "install.sh: $*" >&2; }

# Sets a variable for the rest of this script and for every later command in the session.
persist() {
  export "$1=$2"
  if [ -n "$CLAUDE_ENV_FILE" ]; then
    printf 'export %s=%q\n' "$1" "$2" >>"$CLAUDE_ENV_FILE"
  fi
}

# Where this Playwright looks for its headless Chromium under $PLAYWRIGHT_BROWSERS_PATH, such as
# .../chromium_headless_shell-1248. A dry run only prints, so it needs no network.
wanted_shell() {
  pnpm exec playwright install --dry-run --only-shell chromium 2>/dev/null |
    sed -n 's/^ *Install location: *//p' | head -n 1
}

# The newest build of one image browser (chromium-*, chromium_headless_shell-*), or nothing.
newest() {
  ls -d "$IMAGE"/"$1"-*/ 2>/dev/null | sort -V | tail -n 1
}

playwright_browser() {
  local want source exe platform
  if [ -d "$IMAGE" ]; then
    want=$(PLAYWRIGHT_BROWSERS_PATH="$IMAGE" wanted_shell)
    if [ -n "$want" ] && [ -d "$want" ]; then
      persist PLAYWRIGHT_BROWSERS_PATH "$IMAGE"
      say "Playwright uses the image's browsers ($want)."
      return
    fi
    source=$(newest chromium_headless_shell)
    exe=$(find "${source:-/nonexistent}" -maxdepth 2 \( -name chrome-headless-shell -o -name headless_shell \) -type f 2>/dev/null | head -n 1)
  fi
  if [ -n "$exe" ]; then
    want=$(PLAYWRIGHT_BROWSERS_PATH="$SHIM" wanted_shell)
    if [ -z "$want" ]; then
      say "Playwright didn't say which browser build it wants; is pnpm install done?"
      return
    fi
    # Playwright looks for <build>/<platform folder>/chrome-headless-shell (its registry's names).
    case "$(uname -m)" in
    aarch64 | arm64) platform=chrome-headless-shell-linux-arm64 ;;
    *) platform=chrome-headless-shell-linux64 ;;
    esac
    # Links file by file into a folder of our own: linking the image's folder itself would let a
    # later write land in /opt. Chrome finds its resources from its real path, so links are enough.
    rm -rf "$SHIM"
    mkdir -p "$want/$platform"
    ln -s "$(dirname "$exe")"/* "$want/$platform/"
    [ -e "$want/$platform/chrome-headless-shell" ] ||
      ln -s "$exe" "$want/$platform/chrome-headless-shell"
    touch "$want/INSTALLATION_COMPLETE"
    # The image's other browsers and tools (ffmpeg, full Chromium) stay reachable through the shim.
    for entry in "$IMAGE"/*; do
      [ -e "$SHIM/$(basename "$entry")" ] || ln -s "$entry" "$SHIM/"
    done
    persist PLAYWRIGHT_BROWSERS_PATH "$SHIM"
    say "Playwright uses the image's $(basename "$source") as $(basename "$want") through $SHIM."
    return
  fi
  # No image browsers: download, as on a plain machine. The system libraries need apt and root.
  pnpm exec playwright install --only-shell chromium ||
    say "Couldn't download Playwright's Chromium: the end-to-end checks can't run here."
  pnpm exec playwright install-deps chromium >/dev/null 2>&1 ||
    say "Couldn't install Chromium's system libraries."
}

agent_browser() {
  local source exe
  source=$(newest chromium)
  exe=$(find "${source:-/nonexistent}" -maxdepth 2 -name chrome -type f 2>/dev/null | head -n 1)
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
playwright_browser
agent_browser
exit 0
