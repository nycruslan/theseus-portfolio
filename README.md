# Theseus

A portfolio that an AI agent team keeps rebuilding, sprint by sprint, in public.

Every few hours a Claude Code session wakes up in this repository as **Atlas**, the team lead. It
sizes the next roadmap item, briefs one builder (with tests written first for anything bigger than a
one-line change), and opens a pull request. GitHub then decides: CI must pass, a gate run from
`main` must agree the PR stays out of the owner's files, and Lens, the code reviewer, must say ship
from a fresh review in GitHub Actions. If something needs the owner, the PR waits. It all runs
through GitHub's REST API, so the team works the same on a laptop and as a cloud routine. Every step
streams live to the Studio.

## How it works

| Piece | Where |
|---|---|
| The team's roles | [`.claude/agents/`](.claude/agents) |
| How the team works | [`.claude/skills/sprint/`](.claude/skills/sprint/SKILL.md) |
| Design and engineering skills | [`.claude/skills/`](.claude/skills) |
| The design bar | [`design/rubric.md`](design/rubric.md) |
| Guardrails and the live broadcast (hooks) | [`.claude/settings.json`](.claude/settings.json), [`.studio/`](.studio) |
| What GitHub checks before a merge | [`.github/workflows/`](.github/workflows) |
| How Atlas merges (waits, then squash-merges) | [`.studio/merge.mjs`](.studio/merge.mjs) |
| Each sprint's contract, positions and decisions | [`.studio/sprint/`](.studio/sprint) |
| What the team has done so far | [`.studio/STATE.md`](.studio/STATE.md) |
| What comes next | [`ROADMAP.md`](ROADMAP.md) |
| Owner-only facts the agents may restyle but never change | [`content/`](content) |

## What binds and what guides

**Binding (GitHub).** The `protect-main` ruleset has no bypass, and requires a pull request plus
three checks from GitHub Actions:
- `check`: lint, typecheck, knip, build, harness tests and the end-to-end suite;
- `gate`: run from `main` on `pull_request_target`, so a PR can't change it. It fails a PR that
  touches the owner's files or `package.json`'s scripts, weakens a test, or ever carried
  `needs-owner`, unless the owner added `owner-approved`;
- `lens`: Claude Code reviews the PR in CI as Lens and fails the check unless the verdict is ship.
  A session can't forge a check run, and a PR that edits the workflow is stopped by `gate`.

**Guidance (the hooks).** The team acts as the owner's GitHub identity, so GitHub can't tell who
added `owner-approved`: that one rule rests on the team keeping it. The hooks keep the team in its
lane without being a boundary: a file-edit guard (owner paths, `e2e/` for Probe, each role's own
memory), deny rules for the obvious (`pkill`, `gh pr merge`, force pushes, the `owner-approved`
label), the builders' `pnpm verify` on stop, and a watchdog for a stalled lead. A shell command can
get past all of them; it can't get past GitHub.

## Local development

```bash
pnpm install
pnpm exec playwright install --only-shell chromium   # once, for the end-to-end checks
pnpm dev            # http://localhost:3000
pnpm verify         # lint, typecheck, knip and build, failing fast
pnpm test:e2e       # Playwright + axe against a production build on port 3300
                    # (PLAYWRIGHT_PORT for another port, PLAYWRIGHT_BASE_URL to test a deploy)
pnpm test:harness   # the team's hooks, the gate, Lens's verdict and merge.mjs
```

### Why `NODE_USE_ENV_PROXY` is set

`.claude/settings.json` sets `NODE_USE_ENV_PROXY=1` for every hook and command. Cloud sessions reach
the internet only through the proxy named in `HTTPS_PROXY`, and Node's built-in `fetch`, which the
hooks use to post the live broadcast to the Studio, ignores that variable unless this one is set.
Without it the broadcast silently stops in the cloud. On a laptop with no proxy variables it changes
nothing. The project runs on Node 24 (`.node-version`, `engines`), which honours it.

Built with Next.js 16, React 19, Tailwind CSS 4 and Claude Code.
