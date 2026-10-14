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

**Binding (GitHub),** once the owner's setup below is done. The team works as its own GitHub
account, with write access and no admin rights, so it can't change the rules or approve as the
owner. The `protect-main` ruleset has no bypass and requires:
- a pull request, and the owner's review wherever `.github/CODEOWNERS` names him;
- `check` (GitHub Actions): lint, typecheck, knip, build, harness tests and the end-to-end suite;
- `gate` (the team's checks app): it holds a PR that touches an owner path, changes
  `package.json`'s scripts, weakens a test or ever carried `needs-owner`, until the owner approves
  its current head;
- `lens` (the checks app): Claude Code reviews the PR as Lens and the check passes only on ship. A
  push that only touches the team's notes keeps the last ship.

Only the checks app can post `gate` and `lens`, and its key lives in a `checks` environment that
serves `main` alone, where both workflows run on `pull_request_target`. Lens reads the PR's code in
a subdirectory and never runs it.

**Guidance (the hooks).** They keep the team in its lane without being a boundary: a file-edit
guard (owner paths, `e2e/` for Probe, each role's own memory), deny rules for the obvious (`pkill`,
`gh pr merge`, force pushes, the repository's admin endpoints), the builders' `pnpm verify` on
stop, and a watchdog for a stalled lead. A shell command can get past all of them. On the owner's
own machine, the team runs with the owner's GitHub login, so there only the ruleset binds.

**Until the setup is done,** only `check` is required, and cloud sessions act as the owner.

## Setup (the owner, once, in this order)

1. **The team's account.** Create a GitHub account for the team, invite it to this repository with
   the **Write** role, and accept the invite. As that account, create a classic personal access
   token with only the `public_repo` scope (fine-grained tokens can't reach a repository where the
   account is only a collaborator). Without the `workflow` scope it can't push workflow files.
2. **Cloud sessions as the team.** Locally, add the token to gh (`gh auth login --with-token`), run
   `/web-setup` in Claude Code so cloud sessions use it, then `gh auth switch` back to yourself.
   In a cloud session, `gh api user --jq .login` should print the team's account. Setting
   `GH_TOKEN` on the cloud environment instead isn't enough: git pushes and the proxy's
   `proxy-injected` path would still carry your own login.
3. **The checks app.** Create a GitHub App on your account (Settings → Developer settings), with
   its webhook off and these repository permissions: Checks read and write, Pull requests read
   and write, Contents read, Issues read. Install it on this repository only. Note its App ID and
   Client ID, and generate a private key.
4. **The `checks` environment.** In this repository: Settings → Environments → New environment
   `checks`, with deployment branches limited to `main`. Add the variable `CHECKS_APP_CLIENT_ID`
   and the secrets `CHECKS_APP_PRIVATE_KEY` and `CLAUDE_CODE_OAUTH_TOKEN`, then delete the
   repository-level `CLAUDE_CODE_OAUTH_TOKEN` secret.
5. **Merge the PR that adds this.** The ruleset still requires only `check`, and this PR's `gate`
   and `lens` don't run until their workflows are on `main`.
6. **Let the app report once.** Open or update any PR into `main`: `gate` posts its first check
   run, which the ruleset needs before it can name the app as a source.
7. **The ruleset.** Edit `protect-main`. Under required status checks, keep `check` (GitHub
   Actions) and add `gate` and `lens` with the checks app as their source. Under "Require a pull
   request before merging", keep 0 approvals and tick "Require review from Code Owners" and
   "Dismiss stale pull request approvals when new commits are pushed". Keep the bypass list
   empty.
8. **Check code-owner review.** GitHub doesn't document how code-owner review behaves with 0
   approvals. A PR that touches only `app/` should merge without your review, and one that touches
   `.claude/` should wait for it. If every PR waits, untick "Require review from Code Owners":
   `gate` still holds owner paths until you approve.

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
