Verdict: ship

# Sprint 3: Lens review of PR #16 at a10d633

I reviewed the whole of `git diff origin/main...a10d633` (base b748d4d) against the contract, and
looked hardest at a10d633. I found no Important issues and no Nits that need a change.

Since the first Lens review (57999ec, `review-lens.md`), the product code hasn't changed:
`git diff --stat 57999ec a10d633` outside `.studio/` and `.claude/` shows only
`e2e/project-cards.spec.ts`. That review still holds for `components/project-card.tsx` and
`app/page.tsx`.

## a10d633

### Does it weaken a check?

No.

- **C4.** For a project with an `href`, the two assertions (`text-decoration-line` contains
  `underline`, and `text-decoration-color` equals `--accent`) are the same as before. They now sit
  inside `if (project.href)`. The ink-colour assertion still runs for every project. For a project
  with no `href`, the old test demanded an underline. That contradicted the direction's no-href
  branch and the component's own branch, which draws a plain `h3` with no link. The new test asserts
  the opposite: no underline. So a no-href card that kept the underline would fail it. That makes
  the check stronger, not weaker, and it matches the contract's C1 (no link without an `href`). The
  only project in `content/profile.ts` today has an `href`, so no current run reaches the no-href
  branch. I traced that branch by hand instead. The `h3` has no decoration class, and neither do
  the `li` or anything up to the `ul`, which is where the walk stops. Its colour is inherited from
  `body { color: var(--foreground) }` in `app/globals.css`. So the branch would pass. I traced it
  but didn't run it.
- **C10 test removed.** The test was added in this same PR and never reached `main`. Against the
  base, the PR still only adds lines to `e2e/`, and it deletes or edits no existing test file. The
  contract's C10 doesn't ask for a Playwright test: "Shown by CI and Probe's report", with the
  `content/` part as a grep. The import of `execFileSync` went with the test. `repoRoot` and
  `existsSync` are still used by C1, C7 and C8, and knip and biome are clean.

### Does anything still trip `.studio/scope.mjs`?

No. I imported `scopeNotes` from `.studio/scope.mjs` and fed it the local diff in the shape of
GitHub's files list (each file's status and patch). I wrote the script in the scratchpad, not the
repo.

- At e55de2c, the head before this commit: one note, ``e2e/project-cards.spec.ts adds `test.skip(` ``.
  That reproduces the failure.
- At a10d633: `NOTES: []`.
- On GitHub, a10d633's checks are `scope` success, `check` success and Vercel success.
- `grep -nE '\.(skip|fixme|fail|only)\s*\(|retries|testIgnore|grepInvert'
  e2e/project-cards.spec.ts` finds nothing.
- The suite's only skip is the owner's existing `fixme` in `content.spec.ts:51`, which isn't in this
  diff.

### Is C10's `content/` guard really covered by scope?

Yes, at both places it can be enforced.

- `OWNER_PATHS` in `.studio/scope.mjs` has `/^content\/(?!drafts(\/|$))/iu`. It ignores case and
  checks both `filename` and `previous_filename`, so a rename into or out of `content/` counts too.
- CI's `scope` job runs that file from the base sha on `pull_request_target`.
- `.studio/gate.mjs`, which `merge.mjs` uses, calls `checkScope` itself.

So a PR that changes `content/` can't merge without the owner. That's better than the old test,
which skipped in CI because CI has no `origin/main`.

There are two exceptions, and both are deliberate policy, not gaps:

- `content/drafts/` is exempt, because CLAUDE.md puts the owner's drafts there.
- The owner's `owner-approved` label lifts the check.

The contract's C10 wording ("`content/` has no diff") is stricter than the drafts rule. That
doesn't matter for this PR, which touches nothing under `content/`
(`git diff --name-only origin/main...HEAD -- content` is empty). C2 still checks the rendered
words.

## Evidence

- `pnpm verify` at a10d633: exit 0. That covers lint (biome ci, 25 infos, no warnings), typecheck,
  knip and build.
- `PLAYWRIGHT_PORT=3377 pnpm test:e2e` at a10d633: exit 0, 30 passed and 1 skipped (the owner's
  `fixme`). C1 to C9 pass, and so does every existing file, none of them edited (`git diff --stat`
  on `e2e/content.spec.ts`, `invariants.spec.ts`, `smoke.spec.ts` and `helpers.ts` is empty).
- The diff against `origin/main` changes no owner path and doesn't touch `package.json`. Its only
  `.claude/` changes are under `agent-memory/`.

## Not verified

- I didn't render the C4 no-href branch. No project in the content reaches it, so I traced it as
  described above.
