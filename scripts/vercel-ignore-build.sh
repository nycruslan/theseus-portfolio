#!/usr/bin/env bash
# Vercel's Ignored Build Step (vercel.json's `ignoreCommand`): exit 0 skips the build, 1 builds.
#
# A preview is skipped only when every file changed since the branch's last successful deployment
# is one the site never reads: a sprint's notes (anything in .crew/sprint/<n>/ but retro.json and
# merge.json, the two lib/sprint-log.ts reads), the crew's memory, or .crew/STATE.md. The branch's
# URL then keeps serving the last build, which is the same site: its source links (KEEL_REF) name
# the earlier commit, whose linked files are the same. Production always builds, and so
# does anything this can't be sure of: a branch's first deployment, a commit the shallow clone
# (10 commits) doesn't hold, or a redeploy of the same commit.
#
# Each skipped build saves a whole copy of the site in Vercel's Deployment Storage. Builds whose
# only changes are crew notes were 65 of the 179 previews in 2026-11-07..14.
set -uo pipefail

build() { echo "Building: $1."; exit 1; }

[[ "${VERCEL_ENV:-}" == "preview" ]] || build "the ${VERCEL_ENV:-unknown} environment always builds"
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
[[ -n "$base" ]] || build "the branch's first deployment"
tip="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

# --no-renames lists a moved file as a deletion and an addition, so a retro.json moved away counts.
changed=$(git diff --name-only --no-renames "$base" "$tip" 2>/dev/null) ||
  build "the clone doesn't hold ${base:0:7}"
[[ -n "$changed" ]] || build "nothing changed since ${base:0:7}, so this is a redeploy"

notes='^(\.crew/sprint/[0-9]+/.+|\.claude/agent-memory/.+|\.crew/STATE\.md)$'
read_by_site='^\.crew/sprint/[0-9]+/(retro|merge)\.json$'
site=$(grep -vE "$notes" <<<"$changed"; grep -E "$read_by_site" <<<"$changed")
[[ -z "$site" ]] || build "the site's files changed since ${base:0:7}: $(head -n 3 <<<"$site" | paste -sd ' ' -)"

echo "Skipping: only crew notes changed since ${base:0:7} ($(wc -l <<<"$changed" | tr -d ' ') files)."
exit 0
