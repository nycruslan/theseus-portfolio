Verdict: ship

# Sprint 1, Lens code review, round 2

(Copied by Atlas from Lens-2's worktree, where it was written and not committed.)

PR #9, branch `sprint/1`, reviewed at `9461555f9ae70d47c43695f22d2e0903a1491e9d`.
Scope: the whole product diff `git diff origin/main...HEAD -- app components`, against
`contract.md`, `direction.md` and `decisions.md` items 1 to 4. The fix round answers
`review-lens.md` and `review-iris.md`. I checked the code and builds myself rather than relying on
anyone's account of them.

## Findings

No Important findings. Two Nits, and neither blocks the merge.

1. **Nit (introduced by the fix, Iris's call): balanced role titles now start their second line
   with the separator.** `app/page.tsx:20-22`. With `text-balance`, both role titles break before
   the `·` at 320 and 390 px. Before the fix, the dot ended line 1:

   | Width | Before (4a28975) | Now (9461555) |
   |---|---|---|
   | 320 | `Senior Software Engineer · / Company name` (from `shots/probe-320-light.png`) | `Senior Software Engineer / · Company name` and `Software Engineer / · Previous company` |
   | 390 | `Senior Software Engineer · Company / name` (the widow, from Iris's review) | the same as 320 |

   I measured the "Now" column character by character in Chromium. The widow Iris reported is gone. Fixing it by
   gluing the dot to the title with a no-break space (`{role.title} · {role.company}`) is
   worse: I tried it in the browser and it splits the job title, giving `Senior Software /
   Engineer · Company name`. A clean fix needs structure, for example the company in its own
   span or on its own line on phones. That's a layout question for Iris, or for item 3. It doesn't
   need to block this PR.

2. **Nit: `source(none)` is an allowlist, so a new folder that holds class names fails silently.**
   `app/globals.css:3-5`. Only `app/` and `components/` are scanned now. If a later sprint puts
   class names in a new top-level folder (`lib/`, `hooks/`, an `ui/` package), its utilities won't
   be generated. No lint, typecheck, knip or build step reports that. You only notice when the page
   renders unstyled. The current comment says why the scope is narrow, but it doesn't tell the
   next builder what to do. Fix: add one line to the comment, something like "add an `@source` for
   any new folder that holds class names". The alternative is a denylist that keeps automatic
   detection, with `@source not "../.studio"; @source not "../.claude";` and the like, but it
   fails the other way, letting new notes folders leak back in. The allowlist is the better default
   for this repo.

Pre-existing and unchanged: the project link is told apart from the text by color alone while at
rest. That's round 1's Nit 3, which goes to item 6 or item 3.

## The fix round, checked

- **Lens Minor 1 (Tailwind scanning the notes) is fixed.** I made clean `next build`s of plain
  `git archive` exports in my scratchpad. The pre-fix commit 4a28975 ships 19,946 bytes of CSS. At
  9461555 it ships 10,298 bytes. I also replayed `@tailwindcss/turbopack`'s compile-and-scan steps
  with `@tailwindcss/node` 4.3.3 and `@tailwindcss/oxide`:
  - At 4a28975, `root: null` scans `.claude`, `.studio`, `design`, `e2e`, `content` and every
    config file. It emits `.text-4xl`, `.text-xl`, `.text-sm`, `.bg-gray-200`, `.animate-spin`,
    `.text-foreground/60` and `.leading-7`.
  - At 9461555, `root: none` with sources `../app` and `../components` scans only `app` and
    `components`, and none of those selectors is emitted.
- **Every utility the components use is still generated, and nothing else is.** I pulled every
  class from `app/page.tsx`, `app/layout.tsx` and `components/section.tsx`. That's 34 classes,
  including `hover:text-foreground`, `hover:underline`, `text-balance` and all five
  `text-step-*`, and each one has a rule in the built CSS. Every class selector in the built CSS is
  either one of those 34 or one of next/font's own `*_className`/`*_variable` classes. `content/`
  has no class names, so leaving it out of the scan loses nothing. Preflight (the base layer) is
  still emitted, and hover rules are still wrapped in `@media (hover:hover)`. `e2e/` doesn't depend
  on any generated class.
- **Iris 1 (`text-balance` on the h3s) is fixed** at `app/page.tsx:20` and `:34`. It applies to the
  role h3s and the project h3, and the link inherits it. The 390 px widow is gone, with the caveat
  in Nit 1.
- **Iris 2 (one leading in the body) is fixed.** `leading-7` is gone from the two summaries
  (`app/page.tsx:24`) and the project description (`:46`). The built CSS has no `.leading-7` rule,
  so all text leading now comes from the step tokens.
- **Nothing else visual changed.** I diffed the computed styles of every element (font size, line
  height, color, background, weight, letter spacing, decoration and text-wrap) between 4a28975
  and 9461555. I did it at 320, 390 and 1440 px, in light and in dark. The only differences:
  - `text-wrap: wrap` became `balance` on the three h3s and the project link.
  - The three body paragraphs' line height went from 28 px to the step's 1.6, which is 25.6 px at
    320, 25.8 px at 390 and 28.8 px at 1440.

  Page height changes by -12.1 px at 320 and 390, and by +3.2 px at 1440. No color, size or font
  changed. There's no horizontal overflow, as the e2e checks C6 and smoke confirm.
- **Decision 4's scope is kept.** Iris 3 (the dark accent's hue) isn't touched and stays in item 2.
  No spacing, layout, content or token values changed in the fix commit.

## Whole diff against the contract

C1 to C6 still hold at 9461555:
- There are 5 color tokens and 5 `clamp()` steps.
- The h1 is 48 px at 320 and 76 px at 1440.
- No `text-(xs|sm|…)` and no `foreground/N` remain in `app/` or `components/`.
- The accent is only on the project link and the Contact links.
- There is one dark block, setting the 5 color tokens and nothing else.

The e2e run below shows all of this. Round 1's findings on the token values, the contrast ratios,
`@theme inline` and the engineering standards still apply, because the fix commit doesn't change
them.

## Evidence

- `git rev-parse HEAD` gives `9461555f9ae70d47c43695f22d2e0903a1491e9d`.
- `pnpm verify` exits 0: lint (17 infos, all in `e2e/`, and `biome ci` on `app components` is
  clean), typegen + tsc, knip, and build (`/` static).
- `PLAYWRIGHT_PORT=3357 pnpm test:e2e`: 15 passed and 1 skipped (`content.spec.ts`'s TODO(owner)
  check, which skips by design). C1 to C6, axe in light and dark, 390 and 320 overflow, and
  reduced motion all pass. Playwright 1.64 wants headless shell 1248 and the sandbox has 1194, so I
  ran it through a `PLAYWRIGHT_BROWSERS_PATH` shim in my scratchpad that points 1248 at the
  installed 1194 binary. Nothing in the repo changed.
- Built CSS: `.next/static/chunks/2usin-nrn4k4_.css`, 10,298 bytes (this is a clean build, and
  CI builds clean too).
- The style diff, the per-character line breaks and the screenshots
  (`lens2-head-{320,390,1440}-{light,dark}.png`) are in my session scratchpad, not the repo.

## Note for whoever measures CSS locally

In my worktree, after `git checkout 4a28975 && pnpm build && git checkout 9461555 && pnpm build`,
the Turbopack cache in `.next/cache` served stale CSS for the HEAD build. It produced 19,978
bytes, byte-identical to compiling the pre-fix `globals.css`, even though the source on disk was
right. I tried to reproduce it twice in fresh exports, once by building the pre-fix cache and
then HEAD, and once by going HEAD, pre-fix, then HEAD. Both times the builds came out right, so I
couldn't isolate the trigger. It isn't the PR's code, and CI and clean builds are right. But if
you measure CSS after switching commits in one checkout, build from a clean `.next` first.

## Not verified

- Production and a Vercel deploy. Vercel restores `.next/cache` between deploys. My test of a
  pre-fix cache followed by a HEAD build came out correct, but I haven't seen a real deploy.
- Browsers other than Chromium 1194. `text-wrap: balance` is supported in current Chrome, Firefox
  and Safari, and where it isn't, it degrades to normal wrapping.
- Why the worktree's Turbopack cache went stale (see the note above).
