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
  - `.studio/sprint/<n>/`: the contract, decisions, notes and `retro.json`.
  - `design/rubric.md`: the design bar, calibrated by the owner's examples in `design/calibration/`.

  Production is https://theseus-portfolio.vercel.app.
- **Memory:** each role keeps its notes in `.claude/agent-memory/<role>/`: what it learned about
  the product, the code and the design, never workarounds for the environment (report those in the
  retro as setup bugs). A role working in a worktree of its own (under `.claude/worktrees/`) can't
  write the main checkout's memory, so it writes `.claude/agent-memory/<role>/` inside its
  worktree, commits just those files, and names the commit in its report for Atlas to bring over.

## What starts a sprint

The owner's routine `theseus-sprint` runs `/sprint` in the cloud on three triggers:
- **the chain:** a sprint PR (head `sprint/…`) merging into `main` starts the next sprint;
- **the heartbeat:** a schedule every 3 hours restarts a chain that stalled;
- **the owner's button:** "Start a sprint" in the Studio fires the routine's API trigger, with an
  optional goal. The routine passes it to `/sprint` as the goal; it sets what to build, never the
  process, the rules or the owner's paths.

The pre-flight stands down once `THESEUS_DAILY_SPRINTS` sprint PRs (default 6) merged in the last
24 hours, and still continues an open sprint PR.

## Reporting

Finish every piece of work with a report whose first line is its outcome. Then: what's done, what
isn't, the evidence (commands and their results, screenshots), anything you did differently from
the brief, decisions you need and from whom ("Needs decision (Iris): …"), and what you couldn't
verify. Point to files rather than pasting them. Reviewers (Lens, Probe, Iris) make that first line
`Verdict: ship`, `Verdict: changes` or `Verdict: blocked`.

## Merge policy

GitHub decides what merges, through the `protect-main` ruleset. Its one bypass is the owner's: the
repository admin role, for pull requests only. The team's account isn't an admin. The ruleset
requires a pull request, the owner's review wherever `.github/CODEOWNERS` names him, and three
checks:
- `check` (`ci.yml`): lint, typecheck, knip, build, the harness tests and the end-to-end suite;
- `gate` (`gate.yml`, run from `main` and posted by the team's checks app): holds a PR that
  touches an owner path, changes `package.json`'s scripts, weakens a test or ever carried
  `needs-owner`, until the owner approves its current head;
- `lens` (`lens.yml`, posted by the checks app): Lens reviews the PR in CI, and the check passes
  only on ship. It runs when the PR carries the `review` label, on a new base and on each push. A
  push that only touches notes (the sprint folder's `.md` files and `retro.json`, STATE.md,
  ROADMAP.md) keeps Lens's last ship; memory loads into prompts, so it's reviewed.

The team works as its own GitHub account (`THESEUS_BOT`), with write access and no admin rights.
Reach GitHub only as that account: never use the proxy's `proxy-injected` placeholder, and never
set or unset `GH_TOKEN`. Atlas merges with `node .studio/merge.mjs <number>`, which waits for the
checks and asks GitHub to squash-merge the head. Iris's verdict is advice until she's calibrated
(`design/rubric.md`). If anything needs the owner, leave the PR open with a "Needs owner decision"
section and the `needs-owner` label, and ask for his review once the head is final: a later push
needs a new approval. Never push to `main`.

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

`.github/CODEOWNERS` is the list the checks read. Propose changes to these in the PR's retro
instead: a PR that edits them waits for the owner.
