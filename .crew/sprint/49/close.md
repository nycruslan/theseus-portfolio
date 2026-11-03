# Closing "the keel" (Quill, sprint 49)

**Verdict: it holds, with one number wrong.** On production, `/crew` shows the six rules, each with
its enforcer, its quote word for word and a link to the right lines on GitHub. All six quotes still
match those lines on main. The keel is one click from "his rules" on `/`, from `/log`, from a record
page and from the panel's Approval line, and each click lands with the heading in view under the
bar. The record line reads "47 sprints merged: 34 on the checks alone, 13 on Ruslan's own call.",
which matches what `/log` counts. But `/log` itself is wrong about one sprint. Sprint 36 (#91)
changed `.github/workflows/ci.yml`, an owner path, and waited for Ruslan's approval
(`.crew/sprint/36/decisions.md` 11), yet `/log` says "Gate" for it. The true line is 47: 33 and 14.
On a section whose whole point is that its claims can be checked, that number goes first
(`plan.md`).

## How I measured

- **Where:** https://theseus-portfolio.vercel.app on 2026-11-03, 03:09 to 03:30 UTC. Its build is
  647727a, main's head: every keel link carries that commit. https://ruslanshulga.com answered 403
  to CONNECT through this sandbox's proxy, so I didn't read it. Sprint 49 was live during the read,
  so `/crew` showed the live state, with Approval reading "Not given yet …".
- **The K specs, unedited:** `PLAYWRIGHT_BASE_URL=https://theseus-portfolio.vercel.app
  PLAYWRIGHT_PORT=3317 pnpm exec playwright test e2e/keel.spec.ts e2e/keel-ways.spec.ts`.
  `playwright.config.ts` drops its web server when `PLAYWRIGHT_BASE_URL` is set. I ran it twice
  (below).
- **The rest:** my own scratch scripts, outside the repository, on `@playwright/test`'s Chromium
  headless shell 1248 at DPR 1:
  - the landings and boxes at 1440 × 900, 1366 × 625 (the short laptop window) and 390 × 844;
  - a 75 s watch of `/crew#keel` at 1536 × 715;
  - text-size reads;
  - a git read of every merged sprint's squash commit against the CODEOWNERS of its parent.

  The screenshots are in the session's scratchpad, not git (listed under "Not verified").

## The outcome sentence, part by part

| The roadmap's claim | On production | Holds? |
|---|---|---|
| Six rules on `/crew`, in plain words | Six `li[data-rule]`, numbered 1 to 6, after the panel. | Yes |
| Each says what enforces it | Rules 1 to 4 bind (GitHub, the gate check twice, Lens's review). Rules 5 and 6 read "Guidance only: …" in a lighter weight, with a dashed rule. | Yes |
| Each quotes its file word for word | Spot-checked on main (647727a). See the next table. | Yes |
| Each links to that line on GitHub | All five files answered 200 at `blob/647727a…`, and each anchor names the quote's lines. | Yes |
| One click from "his rules" on `/` | One `a[href="/crew#keel"]` in the key. At 1440 × 900 it's at y 794–818, inside the first window; at 1366 × 625 it's at 567–591, also inside. At 390 × 844 it's at 1305, below the first window, by the milestone's choice. | Yes |
| … and from `/log` and a record page | One link each on `/log` and `/log/47`, both landing with `h2#keel` at 98–136. | Yes |
| … landing under the bar | From `/`, the `h2` sits at 75–113 under a 56 px bar at 1440 × 900, at 98–136 at 1366 × 625, and at 86–117 under a 52 px bar at 390 × 844. | Yes |
| Approval's "Ruslan Shulga's rules" → `#keel` | One `a[href="#keel"]` in the live state. | Yes |
| The record shows the rules at work | "47 sprints merged: 34 on the checks alone, 13 on Ruslan's own call." It matches `/log`'s Approved column: 47 revisions, 34 Gate (sprint 48's row "Undated"), 13 Owner. **Sprint 36 is miscounted** (below). | **No, off by one** |

**The quotes against main's lines** (`git show origin/main:<path>`, at production's commit):

| Rule | Link | The lines on main hold the quote |
|---|---|---|
| 1 | `CLAUDE.md#L60-L61` | "GitHub decides what merges: the `protect-main` ruleset requires `check` (CI), `gate` (the owner's / paths and decisions) and `lens`." Yes |
| 2 | `.github/CODEOWNERS#L1` | "# The owner's paths: a PR that touches one waits for @nycruslan to approve its head." Yes |
| 3 | `.github/CODEOWNERS#L8` | "# The owner's facts; drafts are the team's, for the owner to approve." Yes |
| 4 | `.crew/scope.mjs#L10-L11` | "Lens accepts each one only when the PR names it and why the behaviour it / checked is gone." Yes |
| 5 | `.crew/guard.mjs#L5` | "… so builders can't rewrite the checks their work is judged by;" Yes |
| 6 | `.crew/gate.mjs#L22-L24` | "Sessions reach / GitHub as the owner, so they could post that approval too: merge.mjs leaves such a PR for the / owner to merge by hand." Yes |

## Is the record line right?

At sprint 48, the line read "46 sprints merged: 33 / 13". Now that 48 has merged, production says
47: 34 / 13, which is 48's own row counted on the checks alone. That is how `/log` counts: I
classified all 47 retros by `lib/sprint-log.ts`'s rule (`/\bneeds-owner\b/` in `outcome`) and got
34 and 13. So the line and `/log` agree, as K12 requires.

They agree on a mistake. For every retro, I checked whether its squash commit on main touched an
owner path, using the CODEOWNERS of that commit's parent, read with `.crew/scope.mjs`'s
`codeowners`:

- One sprint marked Gate touched an owner path: **sprint 36, #91, `.github/workflows/ci.yml`**. It
  raised CI's cap to 35 minutes. `decisions.md` 11 says it "carries `needs-owner`: `gate` holds it
  until the owner approves the head, and the owner merges".
- Its retro's `outcome` says "waits for the owner: …" without the token, so `/log`, `/log/36`
  ("Approved Gate") and the keel all count it as approved on the checks alone.
- The 13 marked Owner touched no owner path. They were his calls for other reasons (directions,
  retired checks, the feed's contract), which is right.
- Sprint 17 (#51) says it waited for his approval on the canvas, but the PR itself merged on the
  checks. Gate is right for it.

**The true line today is "47 sprints merged: 33 on the checks alone, 14 on Ruslan's own call."** No
visitor would catch it from the page, but anyone who opens #91 from `/log/36` would. The fix is one
word in a retro plus a guard so it can't drift again. It's the first sprint of `plan.md`.

## The K checks on production

| Run | Result | Time |
|---|---|---|
| 1, about 03:11 UTC | 13 passed, **1 failed**, 3 skipped | 1.4 min |
| 2, about 03:16 UTC | 14 passed, 3 skipped | 1.1 min |

- **Skipped in both runs, by design:**
  - K1's and K7's live-fixture passes (`keel.spec.ts:1305`);
  - K12 in every feed state (`keel-ways.spec.ts:728`).

  Both describes skip under `PLAYWRIGHT_BASE_URL`, because they need this checkout's build served
  against the fixture server. They were named for Lens in #110 and #112.
- **Passed:** K1 (default pass), K2, K3, K4, K5, K6 (all five windows, light and dark), K9, K10, K12
  (against production's own `/log`), and K11 in run 2.
- **Red once: K11's scripts-on landing** (`keel-ways.spec.ts:455`). The layout shift after landing
  was:
  - 0.0065 from `/` at 1440 × 900, scripts on;
  - 0.0057 from `/` at 1536 × 715;
  - 0.0065 from `/` at 1440 × 900 with WebGL;
  - 0.0217 from Approval at 1536 × 715.

  The scripts-off passes held. Run 2, unchanged, passed. The feed logged a new moment ("Opened PR
  #113", 03:12:08Z) during run 1. Sprint 49 was live, so `/crew` polls every 30 s, and a new moment
  adds an Activity row and a tick above the keel. That is the likely cause, not a proven one. A 75 s
  watch of `/crew#keel` at 1536 × 715 afterwards (two live polls, no new moment) recorded no shift
  at all.
  - So K11's deployed CLS read holds only while the feed is still. That breaks `.crew/STATE.md`'s
    rule that only a pass that holds in every feed state may run under `PLAYWRIGHT_BASE_URL`.
  - If the cause is right, a reader sitting on the keel while a run is live can see the text move
    when a moment lands. The rubric's phone budget says nothing shifts after load.
  - It goes in `first-contract.md` as a rider: root cause first, and no skip without Lens.

## The visitor's read

- **The first five seconds on `/` are unchanged.** The keel adds nothing to the first window, by
  design. "His rules" is the one underlined phrase in the key's muted second sentence. A hiring
  executive who reads the key will find it. One who reads only the name, the role and the
  particulars won't, and that is the right priority.
- **On `/crew#keel` he understands it at once.** "Keel" plus the lead's first two sentences say what
  this is. The six sentences are short, plain claims. "Enforced by GitHub", "Enforced by the gate
  check" and "Guidance only" sort them by strength without a legend. The two honest "Guidance only"
  rules are the most convincing thing on the page: a governance section that names its own gaps
  reads as written by someone who has run one.
- **He can get to the facts.** Each source link answers on GitHub at the deployed commit and lands on
  the quoted lines.
- **What would make him doubt it.** The record line is 13 px muted text under the lead. It's the
  only claim in the keel with no link to its evidence, and it's off by one. A skeptical engineer
  checks numbers, and this one is checkable through `/log/36` and #91. That's the next sprint.
- **On a phone (390 × 844)** the landing is clean, and the quotes wrap inside the column with no
  sideways scroll (K6 at 390 × 664 and 320 × 568).
- **At a 24 px default text size on a phone, seven of the eight routes I read scroll 24 px
  sideways.** Only `/read` fits. The routes were `/`, `/crew`, `/log`, `/log/47`, `/read`,
  `/work/ai-gateway`, `/ask` and `/evals`, with the size set through CDP's `Page.setFontSizes`. The
  bar's nav reaches 405 px on a 390 window, and "Contact" is cut at the edge (screenshot
  `home-390x844-font24.png`). At 20 px it fits, and so does 1440 × 900 at 24 px. A 1280 × 800
  window at 200% zoom (read as 640 × 400) fits on all eight routes. This is the parked item. It's
  measured now, and it stays parked (`plan.md`).

## Left open, sorted by what each waits for

Checked against the code on 2026-11-03.

- **Taken by the next sprint (`first-contract.md`):**
  - sprint 36's Approved;
  - a guard against that drift;
  - Iris's idea that the record line links to `/log`;
  - K11's deployed CLS read.
- **Waiting for a sprint that touches their code (parked while the crew stands down):**
  - Iris's focus ring: 2 px at a 2 px offset touches the lines around an inline link. Fixing it means
    Probe rewriting `crew.spec.ts:1256` and three other ring checks.
  - The bar at a 24 px default font, measured above (Forge and Iris).
  - No check reads the model's hand-off (LCD text) at Wa's and Wc's widths, and Wa's rule loses it at
    1300 × 650.
  - `openHome` and `shownOn` copied in two W specs, with Probe's memory line on `e2e/window.ts`.
  - The keel in `/llms.txt` and `/api/me.json`, and `/crew`'s own card. `/crew` re-exports `/`'s
    card today (`app/crew/opengraph-image.tsx`).
  - Iris's memory lines 66 and 67.
- **Accepted:** the keel's top is below the first window on `/crew` at 1440 × 900 in the live state
  (y 1125; 844 on the default server). The panel comes first, by Iris's placement (a).
- **Not verified:**
  - the `protect-main` ruleset's three required checks: rule 1's enforcer, still unread from the
    cloud;
  - Safari and Firefox;
  - a real phone;
  - the Approval landing with scripts off (Iris's note on #112).
- **For the owner, optional and unchanged:** his B3 to B5 demos on his own window, and the
  five-second test.

## Not verified

- https://ruslanshulga.com: CONNECT answered 403 from this sandbox.
- The fixture passes of K1, K7 and K12. They ran in #110's and #112's CI, not here.
- That the new moment caused run 1's shift. The timing fits, but I didn't reproduce it.
- That the gate held #91 in practice. Reading the PR's reviews through the GitHub API was refused
  in this session. The diff touching `.github/` and `decisions.md` 11 are the evidence.
- Screenshots (scratchpad, `shots/`): `home-`, `keel-landed-`, `keel-section-` and `crew-top-` at
  1440x900, 1366x625 and 390x844, plus `home-390x844-font24.png` and `crew-390x844-font24.png`.
