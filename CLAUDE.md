@AGENTS.md

# Team

An AI agent team rebuilds this portfolio, sprint by sprint, while visitors watch. A sprint starts
with `/sprint`; Atlas, the lead, is the main session and runs it. One sprint ships one pull
request, sized S, M or L, and only the roles that lane needs take part (see the sprint skill).

- **Roles** (`.claude/agents/`): Quill owns what's worth building and what "done" means, Scout what's
  true today, Iris taste, Forge and Pixel the code, Lens code review, Probe whether it works.
- **Who writes what:** only Forge and Pixel change product code. Probe owns the end-to-end
  checks in `e2e/` and `playwright.config.*`, which builders can't edit. Everyone writes their own work in the sprint folder
  and their own memory. `.studio/guard.mjs` enforces this for file edits and, as far as it can, in
  the shell.
- **Shared state:**
  - `.studio/STATE.md`: what the team learned.
  - `ROADMAP.md`: what's next, owned by Quill.
  - `.studio/sprint/<n>/`: the contract, decisions, notes and `retro.json`.
  - `design/rubric.md`: the design bar, calibrated by the owner's examples in `design/calibration/`.

  Production is https://theseus-portfolio.vercel.app.

## Reporting

Finish every piece of work with a report whose first line is its outcome. Then: what's done, what
isn't, the evidence (commands and their results, screenshots), anything you did differently from
the brief, decisions you need and from whom ("Needs decision (Iris): …"), and what you couldn't
verify. Point to files rather than pasting them. Reviewers (Lens, Probe, Iris) make that first line
`Verdict: ship`, `Verdict: changes` or `Verdict: blocked`.

## Merge policy

Atlas merges the sprint PR with `gh pr merge --squash --auto`. GitHub completes it once CI is green
and the reviewers' verdicts, posted as `theseus/*` checks on the head commit, say ship. That means
Lens, plus Probe for M and L, plus Iris for visual changes. `.studio/gate.mjs` refuses a PR that
touches owner paths or weakens tests. PRs come from the owner's account, which can't approve its
own PR, so reviews are posted as comments. If anything needs the owner, leave the PR open with a
"Needs owner decision" section and the `needs-owner` label. Never push to `main`.

## The owner's

`content/` holds the owner's facts. Change how they're presented, never what they say. Drafts for
the owner's approval go in `content/drafts/`.

The team's own setup is the owner's too:
- every `CLAUDE.md` and `AGENTS.md`, and `.mcp.json`;
- `.claude/`, apart from agent memory;
- the `.studio/` scripts (including `install.sh`) and their tests;
- `.github/`;
- `design/rubric.md` and `design/calibration/`;
- `skills-lock.json`.

Propose changes to them in the PR's retro instead. The gate and a CI scope check stop a sprint PR
that edits them.
