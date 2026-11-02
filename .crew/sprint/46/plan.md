# The next milestone: the keel (Quill, sprint 46)

## The outcome

A hiring executive who asks whether the AI crew is real and governed, or a gimmick, finds the
answer on `/crew`. The page lists the rules the crew can't break: nothing merges without the
tests, the gate and Lens's review; his rules and his facts wait for his approval; no test is
weakened without a reason Lens accepts. Each rule is quoted word for word from the file that
enforces it and linked to that line on GitHub, and each says honestly what enforces it: GitHub,
the gate check, Lens, or only guidance. He reaches it in one click from the line on `/` that says
"his rules". Next to the rules, the record shows them at work. Today that's 44 sprints merged: 31
on the checks alone, and 13 on his own call.

It takes two sprints, with checks K1 to K12:

- **Ka (M):** the keel on `/crew`. Iris places it first.
- **Kb (S):** the ways in, and the record behind it.

No sprint touches an owner path or `content/`, and none needs an owner answer to start.

## Why this one

- **Belief 2 is the site's open question now.** `close.md` finds the first window carrying belief 1
  at every window measured. The executive's next doubt is the crew: "a team of AI agents shows what
  it can ship on its own" invites "and who stops them?". The site shows the crew working (`/crew`,
  `/log`) but not what holds it to account. An AI-platform leader is hired for that judgment:
  guardrails, review, a human on the calls that matter.
- **It's the Owner's pick's recommended option, built without waiting because it can be undone.**
  The pick was asked in sprint 42's PR (#101) and is unanswered. The keel adds a section that can
  be taken down, the repository it quotes is already public, and it needs no new facts. If he picks
  the JPMorgan case study instead, that becomes next, and the keel stays or goes at his word.
- **Why not standing down:** the site's positioning (`PRODUCT.md`) is "under rules the owner set",
  and no page shows those rules. The panel's Approval line names "Ruslan Shulga's rules" and the
  key on `/` says "his rules", but neither links anywhere.

## What exists now (production, 2026-11-02)

- **`/crew`** (`app/crew/page.tsx`) is a two-column grid from 1024: the detail drawing sticky at
  the left, and the panel (`components/crew.tsx`, rendered on the client by
  `components/crew-live.tsx`) at the right. At 1440 × 900 the panel runs from y 72 to 1106 and ends
  with `dl.crew-facts`: Studio, Evidence, Approval and Rules (y 882–1067). At 390 × 664 the page is
  one column, the panel ends at 1376, and the facts list sits at 1033–1336. The panel's "Rules" is
  the Studio feed's broadcast rules ("Only real events…"), not the crew's.
- **The files a keel quotes,** all public (`https://github.com/nycruslan/theseus-portfolio`
  answered 200 here without a login) and all owner paths:

| # | Rule, in a visitor's words (draft) | Enforced by | Source and lines | The quote, verbatim |
|---|---|---|---|---|
| 1 | Nothing merges until three checks pass: the tests, the gate and Lens's review. | GitHub's ruleset | `CLAUDE.md` 60–61 | "GitHub decides what merges: the `protect-main` ruleset requires `check` (CI), `gate` (the owner's paths and decisions) and `lens`." |
| 2 | A change to the crew's own rules, or to how its work is judged, waits for Ruslan's approval. | the gate check | `.github/CODEOWNERS` 1 | "The owner's paths: a PR that touches one waits for @nycruslan to approve its head." |
| 3 | Ruslan's facts are his: the crew drafts, he approves. | the gate check | `.github/CODEOWNERS` 8 | "The owner's facts; drafts are the team's, for the owner to approve." |
| 4 | No test is weakened to get a pass unless Lens accepts the reason. | Lens's review | `.crew/scope.mjs` 10–11 | "Lens accepts each one only when the PR names it and why the behaviour it checked is gone." |
| 5 | The agents who build can't edit the tests they're judged by. | Guidance only | `.crew/guard.mjs` 5 | "builders can't rewrite the checks their work is judged by" |
| 6 | Every session reaches GitHub as Ruslan, so a pull request his approval let through is left for him to merge. | Guidance only | `.crew/gate.mjs` 22–24 | "Sessions reach GitHub as the owner, so they could post that approval too: merge.mjs leaves such a PR for the owner to merge by hand." |

  - **Rules 5 and 6 are guidance, and the keel says so.** `guard.mjs` says of itself "It's
    guidance, not a boundary: a shell command or a script can still write anything". `merge.mjs`
    is the crew's own script. Saying which rails bind and which only guide is the honest version
    (`PRODUCT.md` principle 3), and it's the judgment an executive is looking for.
  - Rule 6 publishes the setup's one known gap. It's already in the public code. I keep it: a
    governance page that names its own limit is more believable than one that doesn't. Ruslan may
    take it down after the merge.
- **The ruleset isn't a file.** `protect-main` lives in GitHub's settings. Rule 1 quotes
  `CLAUDE.md`, which states it, and names GitHub as the enforcer. I couldn't read the ruleset from
  here (the GitHub API call was refused in this session). Atlas confirms the three required checks
  from `merge.mjs`'s output on the next merge before Ka's build.

## A build constraint the contract must carry

`/crew` regenerates on Vercel's servers when the feed's cached read expires (`next.config.ts`'s
comment), and `.crew/**/*.mjs` is excluded from the functions' file tracing. So a keel that reads
its sources with `readFileSync` while rendering works at build and then fails, or drops every
rule, on the first regeneration. The quotes must be fixed at build. One way is Turbopack's text
modules: a `turbopack.rules` entry with `condition: { query: '?raw' }, type: 'text'`, documented in
`node_modules/next/dist/docs/01-app/02-guides/migrating/from-vite.md`. `next.config.ts` isn't an
owner path, and a `*.d.ts` for the import falls under `tsconfig.json`'s existing `**/*.ts`. Forge
proves it on a scratch build first, including the extension-less `CODEOWNERS`. The mechanism is
his call, and the constraint isn't.

## The sprints

### Ka (M): the keel on `/crew`

The six rules, server-rendered after the panel, each with its enforcer, its verbatim quote and a
link to the line. A rule drops if its file loses the quote, as the particulars drop a row (P2's
precedent). Checks K1 to K8 and one rider, in `first-contract.md`.

**Iris's call first, on these measurements,** since it's a new section on a page whose two columns
and sticky drawing every `/crew` check pins:

- **(a) Under the panel, in the right column.** The drawing stays sticky beside it, and the panel
  grows by the keel's height, about 450 px at 1440 for six rules.
- **(b) A full-width band under both columns,** like a drawing's "General notes". It has more
  presence, but the drawing scrolls away as the band arrives.
- **(c) Something better.** She also sets the type for the quotes (the site has no code face yet)
  and the visual difference between "binds" and "guidance". Nothing is copper.

Wherever it sits, nothing in the panel or the drawing moves (K7). Pixel joins only if the keel
meets the model's layer, which K6 forbids.

### Kb (S): the ways in, and the record behind it

- **K9 From `/` and `/log`:** in the key's second sentence, "his rules" becomes a link to
  `/crew#keel`.
  - P8's clause "no a, button or [tabindex]" becomes "exactly one a, to `/crew#keel`, and no
    button or [tabindex]".
  - B2.3's list grows from 24 stops to 25, with `/crew#keel` after the title block's three links
    and before the revisions' Log link.
  - Both are rewrites that keep their strength (exact text, exact stops). The PR names them for
    Lens. P10 runs unedited.
- **K10 From `/crew`'s panel:** Approval's "Ruslan Shulga's rules" links to `#keel`. `/crew`'s
  script budgets (`crew.spec.ts:1396` and `:1402`) run unedited, and the bytes are reported.
- **K11 It lands:** following the link from `/` to `/crew#keel` at 1440 × 900, 1536 × 715 and
  390 × 664 puts the keel's `h2` wholly in view below the bar, with scripts on and off and CLS 0.
- **K12 The record behind the rules:** one line in the keel, "N sprints merged: G on the checks
  alone, O on Ruslan's own call."
  - The counts come from the retros by the Approved column's own rule (`lib/sprint-log.ts`,
    `ownersCall`) and equal `/log`'s Gate and Owner counts. Today that's 44, 31 and 13.
  - It's server HTML, in every feed state.

Kb waits for Ka's anchor and placement. It's S unless Iris moves the key's line, and then it's M.

## Budgets for every sprint

| Budget | Check |
|---|---|
| Every fact and quote is server HTML at full opacity, and reads with scripts off | K1, K11 |
| 0 B of new script on `/` (Kb's link is server HTML) | B2.10, unedited |
| `/crew` within its script budgets | `crew.spec.ts` and `crew-replay.spec.ts` budgets, unedited; Ka adds 0 B |
| CLS 0 on `/crew` at load | K7 (B1.8's read) |
| `/`'s first window unchanged | W1 to W17, B4.22, P3, unedited |
| Nothing new is copper | B1.6's rule, K6 |
| CI under `check`'s 35 minutes | reported in the PR |

## Out of scope

- **Changing any rule.** The keel quotes the crew's rails and edits none. Reading `CLAUDE.md`,
  `.github/CODEOWNERS` and `.crew/*.mjs` into the build doesn't change them. No sprint touches an
  owner path or `content/`.
- **A JPMorgan case study:** it waits for the owner's facts and his pick.
- **The keel in `/llms.txt` and `/api/me.json`:** a follow-up once the section has settled.
- **The keel in `/`'s first window:** belief 1 comes first there, and Kb's link is the way in.
- **Renaming the panel's "Rules":** `e2e/crew.ts:401` reads it.
- **`/crew`'s share card and description:** a follow-up.

## What waits for the owner

Nothing holds the work. The Owner's pick stays open in `ROADMAP.md`, with the keel built as its
recommended option. He may take the keel down, or rule 6 alone, after any merge, and he may pick
the case study next.
