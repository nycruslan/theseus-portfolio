@AGENTS.md

# Team

An AI agent team rebuilds this portfolio, sprint by sprint, while visitors watch. A sprint starts
with `/sprint`; Atlas, the lead, is the main session and runs it. One sprint ships one pull
request, sized S, M or L, and only the roles that lane needs take part (see the sprint skill).

- **Roles** (`.claude/agents/`): Quill owns what's worth building and what "done" means, Scout what's
  true today, Iris taste, Forge and Pixel the code, Lens code review, Probe whether it works.
- **Who writes what:** Forge and Pixel change product code. Probe owns the end-to-end checks in
  `e2e/`, which builders can't edit. Everyone writes their own work in the sprint folder and their
  own memory. `.studio/guard.mjs` holds to this for file edits, MCP tools and, as far as it can,
  the shell. The lead doesn't write product code either, but that's the sprint skill's rule, not
  the guard's: the guard lets the main session write, since the owner's own sessions run as it.
- **Shared state:**
  - `.studio/STATE.md`: what the team learned.
  - `ROADMAP.md`: what's next, owned by Quill.
  - `.studio/sprint/<n>/`: the contract, decisions, notes and `retro.json`.
  - `design/rubric.md`: the design bar, calibrated by the owner's examples in `design/calibration/`.

  Production is https://theseus-portfolio.vercel.app.
- **Memory:** each role keeps its notes in `.claude/agent-memory/<role>/`. The directory is set when
  the role starts, from the session's checkout, so a role working in a worktree of its own (under
  `.claude/worktrees/`) is pointed at the main checkout, where Claude Code blocks its writes. It
  writes to `.claude/agent-memory/<role>/` inside its worktree instead, commits just those files,
  and names the commit in its report so Atlas brings it to the sprint branch.

## Reporting

Finish every piece of work with a report whose first line is its outcome. Then: what's done, what
isn't, the evidence (commands and their results, screenshots), anything you did differently from
the brief, decisions you need and from whom ("Needs decision (Iris): …"), and what you couldn't
verify. Point to files rather than pasting them. Reviewers (Lens, Probe, Iris) make that first line
`Verdict: ship`, `Verdict: changes` or `Verdict: blocked`.

## Merge policy

Atlas merges the sprint PR with `node .studio/merge.mjs <number>`, the only way to merge. It talks to
GitHub through REST, so it works the same on a laptop and in a cloud session, where GraphQL (and
with it `gh pr`, `gh issue` and auto-merge) is blocked. It waits for CI on the PR's head and
squash-merges that exact commit once:
- CI is green: every check that reported passed, and every check the base branch's ruleset
  requires, plus CI's `check` and `scope`, reported (one that never ran hasn't passed);
- the reviewers' verdicts say ship about the code being merged: Lens always, Probe when `e2e/`
  changed or whenever she gave a verdict on the PR, and Iris whenever she gave one, but only once
  she's calibrated. Until `design/calibration/` holds the owner's scored examples, Iris's verdict
  is advice: merge.mjs reports it and merges anyway, and her `changes` alone is no reason for
  `needs-owner`. The verdict hook posts each one as a comment on the
  PR with a `theseus-verdict` marker, and as a `theseus/*` commit status where GitHub takes it (the
  cloud's proxy doesn't), which counts only for a role with no comment;
- the PR touches no owner path, leaves `package.json`'s scripts alone and weakens no test;
- the PR never carried the `needs-owner` label.

Otherwise it says why not. PRs come from the owner's account, which can't approve its own PR, so
reviews are posted as comments. If anything needs the owner, leave the PR open with a "Needs owner
decision" section and the `needs-owner` label. Never push to `main`.

The team acts as the owner's GitHub identity, so these rules hold because you keep them: never
post, edit or delete a verdict comment, and never merge or reach `main` any other way. The hooks
refuse the attempts they can see.

## The owner's

`content/` holds the owner's facts. Change how they're presented, never what they say. Drafts for
the owner's approval go in `content/drafts/`.

The team's own setup is the owner's too:
- every `CLAUDE.md`, `AGENTS.md` and `.gitattributes`, and `.mcp.json`;
- `.claude/`, apart from agent memory;
- the `.studio/` scripts (including `install.sh` and `merge.mjs`) and their tests;
- `.github/`;
- `design/rubric.md` and `design/calibration/`;
- `skills-lock.json`;
- the toolchain's settings: `biome.json`, `tsconfig.json`, `knip.json`, `pnpm-workspace.yaml`,
  `renovate.json` and `playwright.config.*`, and the `scripts` in `package.json`. Dependencies
  are the team's.

Propose changes to them in the PR's retro instead. `merge.mjs` and a CI scope check stop a sprint PR
that edits them.
