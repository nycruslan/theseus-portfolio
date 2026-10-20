@AGENTS.md

# Team

An AI agent team rebuilds this portfolio, sprint by sprint, while visitors watch. A sprint starts
with `/sprint`; Atlas, the lead, is the main session and runs it. One sprint ships one pull
request, sized S, M or L, and only the roles that lane needs take part (see the sprint skill).

- **Roles** (`.claude/agents/`): Quill owns the roadmap and, on large work, what "done" means; Iris
  taste; Forge the code, and Pixel 3D and motion; Lens code review; Probe whether it works.
- **Who writes what:** Forge and Pixel change product code. Probe owns the end-to-end checks in
  `e2e/`, which builders can't edit. Everyone writes their own work in the sprint folder and their
  own memory. `.studio/guard.mjs` holds file edits to this. The lead doesn't write product code
  either; that's the sprint skill's rule, since the owner's own sessions also run as the lead.
- **Shared state:**
  - `.studio/STATE.md`: what the team learned.
  - `ROADMAP.md`: what's next, owned by Quill. Atlas ticks what shipped at the sprint's close-out.
    It's the only backlog: the team opens no GitHub issues, and asks the owner in its PR.
  - `.studio/sprint/<n>/`: the contract, decisions, notes and `retro.json`.
  - `design/brief.md`: the owner's direction for the site; `design/rubric.md`: the design bar,
    calibrated by the owner's examples in `design/calibration/`.

  Production is https://theseus-portfolio.vercel.app.
- **Memory:** each role keeps its notes in `.claude/agent-memory/<role>/`: what it learned about
  the product, the code and the design, never workarounds for the environment (report those in the
  retro as setup bugs). A role working in a worktree of its own (under `.claude/worktrees/`) can't
  write the main checkout's memory, so it writes `.claude/agent-memory/<role>/` inside its
  worktree, commits just those files, and names the commit in its report for Atlas to bring over.

## Reporting

Finish every piece of work with a report whose first line is its outcome. Then: what's done, what
isn't, the evidence (commands and their results, screenshots), anything you did differently from
the brief, decisions you need and from whom ("Needs decision (Iris): …"), and what you couldn't
verify. Point to files rather than pasting them. Reviewers (Lens, Probe, Iris) make that first line
`Verdict: ship`, `Verdict: changes` or `Verdict: blocked`.

Visitors watch every command you run in the Studio, which says it by its Bash `description`. So
give every Bash call one: a short imperative line of what it does, such as "Wait for the e2e run to
finish", never the command itself.

## What merges

GitHub decides what merges: the `protect-main` ruleset requires `check` (CI), `gate` (the owner's
paths and decisions) and `lens` (code review), and the owner's review wherever `.github/CODEOWNERS`
names them. In the cloud, GitHub calls act as the owner: the GitHub proxy swaps any token for the
owner's connection. So the owner's powers are in reach, and never yours to use: merge only through
`merge.mjs`, which only Atlas runs (the sprint skill), and never approve or dismiss reviews, change
settings or rulesets, or push to `main`. Iris's verdict is advice until she's calibrated
(`design/rubric.md`).

## The owner's

`content/` holds the owner's facts. Change how they're presented, never what they say. Drafts for
the owner's approval go in `content/drafts/`.

The team's own setup is the owner's too:
- every `CLAUDE.md`, `AGENTS.md` and `.gitattributes`, and `.mcp.json`;
- `.claude/`, apart from agent memory;
- the `.studio/` scripts (including `install.sh` and `merge.mjs`) and their tests;
- `.github/` and `.githooks/`;
- `design/brief.md`, `design/rubric.md` and `design/calibration/`;
- `skills-lock.json`;
- the toolchain's settings: `biome.json`, `tsconfig.json`, `knip.json`, `pnpm-workspace.yaml`,
  `renovate.json` and `playwright.config.*`, and the `scripts` in `package.json`. Dependencies
  are the team's.

`.github/CODEOWNERS` is the list the checks read. Propose changes to these in the PR's retro
instead: a PR that edits them waits for the owner.
