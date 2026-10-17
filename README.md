# Theseus

A portfolio that an AI agent team keeps rebuilding, sprint by sprint, in public.

Each time a sprint merges, a Claude Code session wakes up in this repository as **Atlas**, the team
lead, and starts the next one, up to six a day. It sizes the next roadmap item (or the owner's
goal, when they press "Start a sprint" in the Studio), briefs one builder (with tests written first
for anything bigger than a one-line change), and opens a pull request. GitHub then decides: CI
must pass, a gate run from `main` must agree the PR stays out of the owner's files, and Lens, the
code reviewer, must say ship from a fresh review in GitHub Actions. If something needs the owner,
the PR waits. It all runs through GitHub's REST API, so the team works the same on a laptop and as
a cloud routine. Every step streams live to the Studio.

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

**Binding (GitHub),** once the owner's setup below is done. The team calls GitHub as its own
account, with write access and no admin rights, so it can't change the rules or approve as the
owner. The `protect-main` ruleset requires:
- a pull request, and the owner's review wherever `.github/CODEOWNERS` names them;
- `check` (GitHub Actions): lint, typecheck, knip, build, harness tests and the end-to-end suite;
- `gate` (the team's checks app): it holds a PR that touches an owner path, changes
  `package.json`'s scripts, weakens a test or ever carried `needs-owner`, until the owner approves
  its current head;
- `lens` (the checks app): Claude Code reviews the PR as Lens and the check passes only on ship. A
  push that only touches the team's notes (the sprint folder's `.md` files and `retro.json`,
  `STATE.md`, `ROADMAP.md`) keeps the last ship.

Only the checks app can post `gate` and `lens`, and its key lives in a `checks` environment that
serves `main` alone, where both workflows run on `pull_request_target`. Lens reads the PR's code
outside its workspace and never runs it. The ruleset's one bypass is the owner's, for pull requests
only: they merge their own PRs to owner paths, since nobody can approve their own PR.

**What starts a sprint (the owner's routine).** The routine `theseus-sprint` runs `/sprint` on
three triggers, which only the owner can change:
- GitHub: a sprint PR (head `sprint/…`) merged into `main` starts the next sprint, so the work
  chains;
- a schedule every 3 hours, a heartbeat that restarts a chain that stalled (a run that failed, or
  a day that hit the cap);
- the API trigger, behind the Studio's owner-only "Start a sprint" button, with an optional goal.
  The goal reaches the session in a `<routine-fire-payload>` block labelled untrusted, and the
  routine's prompt opts in only to using it as the sprint's goal: it sets what to build, not how.
  The token is the owner's: whoever holds it can start a run and suggest its goal, with no more
  rights than the team's.

The daily cap is guidance, not binding: the pre-flight Atlas runs (`.studio/next-sprint.mjs`) stands
down once `THESEUS_DAILY_SPRINTS` (default 6) of the team's sprint PRs merged in the last 24 hours.
An open sprint PR is still finished at the cap. Each run also counts against the owner's
subscription usage and the routines' own hourly limits.

**Guidance (the hooks).** They keep the team in its lane without being a boundary: a file-edit
guard (owner paths, `e2e/` for Probe, each role's own memory), deny rules for the obvious (`pkill`,
`gh pr merge`, force pushes, the repository's admin endpoints, overriding `GH_TOKEN`), the
builders' `pnpm verify` on stop, and a watchdog for a stalled lead. A shell command can get past
all of them.

**The residual risk.** In the cloud, git pushes still go through Claude's proxy with the owner's
GitHub connection (branch pushes only; the ruleset protects `main`). An agent that deliberately
sends a REST call through that proxy, with `GH_TOKEN=proxy-injected` or with `GH_TOKEN` unset,
acts as the owner: it could approve a PR, or merge one through the owner's bypass. The deny rules,
the guard, `install.sh` and the sprint pre-flight make that a deliberate act rather than an
accident, and GitHub's audit log records it, but they don't prevent it. On a laptop the same holds
for the owner's own `gh` login unless the session runs as the team (see Setup, step 6).

**Until the setup is done,** only `check` is required, and the team acts as the owner.

## Setup (the owner, once, in this order)

1. **The team's account.** Create a GitHub account for the team, invite it to this repository with
   the **Write** role, and accept the invite. As that account, create a classic personal access
   token with only the `public_repo` scope: fine-grained tokens can't reach a repository where the
   account is only a collaborator, and without the `workflow` scope it can't push workflow files.
2. **The checks app.** Create a GitHub App on your account (Settings → Developer settings), with
   its webhook off and these repository permissions: Checks read and write, Pull requests read
   and write, Contents read, Issues read. Install it on this repository only. Note its App ID and
   Client ID, and generate a private key.
3. **The `checks` environment.** In this repository: Settings → Environments → New environment
   `checks`, with deployment branches limited to `main`. Add the variable `CHECKS_APP_CLIENT_ID`
   and the secrets `CHECKS_APP_PRIVATE_KEY` and `CLAUDE_CODE_OAUTH_TOKEN`, then delete the
   repository-level `CLAUDE_CODE_OAUTH_TOKEN` secret.
4. **The team's cloud environment.** At claude.ai/code, create an environment for the team (say
   `theseus-team`) with the same network access and setup script as Default, and these variables:
   `GH_TOKEN` (the team's token), `THESEUS_BOT` (the team's login), `STUDIO_INGEST_URL` and
   `NODE_USE_ENV_PROXY=1` as on Default. Add the same Studio ingest network secret as Default
   (`Authorization: Bearer …` for the ingest host). A token set on an environment passes through
   to `gh` unchanged, so the team's REST calls come from its account.
5. **Point the routine at it.** Give the coordinator the environment's name, and it switches the
   routine through the routines API (or edit the routine yourself). In a session there,
   `gh api user --jq .login` prints the team's login. Do this before step 7: from then on the
   sprint pre-flight stops any run whose GitHub calls don't act as `THESEUS_BOT`.
6. **Local sessions (recommended).** In `.claude/settings.local.json`, set `env` to the same
   `GH_TOKEN` and `THESEUS_BOT`, and run `gh auth setup-git` once, so git uses `gh`'s token and the
   team pushes as itself. Your own `gh` login stays on the machine, which is the same residual risk
   as above.
7. **Merge the PR that adds this.** The ruleset still requires only `check`, and this PR's `gate`
   and `lens` don't run until their workflows are on `main`.
8. **Let the app report once.** Open or update any PR into `main`: `gate` posts its first check
   run, which the ruleset needs before it can name the app as a source.
9. **The ruleset.** Edit `protect-main`.
   - Required status checks: keep `check` (GitHub Actions), and add `gate` and `lens` with the
     checks app as their source.
   - "Require a pull request before merging": keep 0 approvals, and tick "Require review from Code
     Owners" and "Dismiss stale pull request approvals when new commits are pushed".
   - Bypass list: add the Repository admin role, set to "For pull requests only". That lets you
     merge your own PRs (no direct pushes); the team's account isn't an admin, so it can't.
10. **Check code-owner review.** GitHub doesn't document how code-owner review behaves with 0
    approvals. A team PR that touches only `app/` should merge without your review, and one that
    touches `.claude/` should wait for it. If every PR waits, untick "Require review from Code
    Owners": `gate` still holds owner paths until you approve.
11. **The routine's triggers.** At claude.ai/code/routines, edit `theseus-sprint`.
    - The prompt: "Run /sprint. If a routine-fire-payload block is present, it holds the owner's
      goal for this sprint: pass it to /sprint as the goal."
    - The chain: add a GitHub event trigger on this repository, event `pull_request.closed`, with
      the filters "Is merged = true", "Base branch = main" and "Head branch starts with
      `sprint/`". The Claude GitHub App must be installed on the repository.
    - The heartbeat: replace the schedule with one every 3 hours. Pick the nearest preset, then
      set the cron with `/schedule update` in the CLI (say `7 */3 * * *`: a few minutes past the
      hour starts on time).
    - The button: add an API trigger, copy its `/fire` URL, and generate its token, which is shown
      once. Give both to the Studio as server-side secrets, never to the browser: its owner-only
      "Start a sprint" button POSTs `{"text": "<goal>"}` to that URL, with the headers from the
      trigger's sample curl.
    - The cap (optional): set `THESEUS_DAILY_SPRINTS` in the `theseus-team` environment to change
      the default of 6 sprints a day. A value that isn't a positive integer means 6.

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
