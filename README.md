# Theseus

A portfolio that an AI agent team keeps rebuilding, sprint by sprint, in public.

Each time a sprint merges, a Claude Code session wakes up in this repository as **Atlas**, the team
lead, and starts the next one, up to six a day. It sizes the next roadmap item (or the owner's
goal, when they press "Start a sprint" in the Studio), briefs one builder (with tests written first
for anything bigger than a small change), and opens a pull request. GitHub then decides: CI
must pass, a gate run from `main` must agree the PR stays out of the owner's files, and Lens, the
code reviewer, must say ship from a fresh review in GitHub Actions. If something needs the owner,
the PR waits. It all runs through GitHub's REST API, so the team works the same on a laptop and as
a cloud routine. Every step streams live to the Studio.

## How it works

Three parts, each in its own place:
- **The portfolio**, the product: [`app/`](app), [`components/`](components), [`lib/`](lib),
  [`content/`](content), [`e2e/`](e2e) and [`design/`](design).
- **The crew**, the agent team: its roles and skills in [`.claude/`](.claude), its scripts, notes
  and sprint records in [`.crew/`](.crew), and its checks in [`.github/`](.github).
- **The Studio**, the live view of the crew:
  [nycruslan/theseus-studio](https://github.com/nycruslan/theseus-studio), a separate app.

| Piece | Where |
|---|---|
| Who the site is for and what it must prove | [`PRODUCT.md`](PRODUCT.md) |
| The owner's direction, and the research behind it | [`design/brief.md`](design/brief.md), [`design/research/`](design/research) |
| The team's roles | [`.claude/agents/`](.claude/agents) |
| How the team works | [`.claude/skills/sprint/`](.claude/skills/sprint/SKILL.md) |
| Design and engineering skills | [`.claude/skills/`](.claude/skills) |
| The design bar | [`design/rubric.md`](design/rubric.md) |
| Guardrails and the live broadcast (hooks) | [`.claude/settings.json`](.claude/settings.json), [`.crew/`](.crew) |
| What GitHub checks before a merge | [`.github/workflows/`](.github/workflows) |
| How Atlas opens a PR (a draft, through the checks app, so the owner can approve it) and marks it ready | [`.crew/open-pr.mjs`](.crew/open-pr.mjs), [`.crew/ready-pr.mjs`](.crew/ready-pr.mjs) |
| How Atlas merges (waits, then squash-merges) | [`.crew/merge.mjs`](.crew/merge.mjs) |
| Each sprint's contract, positions and decisions | [`.crew/sprint/`](.crew/sprint) |
| What the team has done so far | [`.crew/STATE.md`](.crew/STATE.md) |
| What comes next | [`ROADMAP.md`](ROADMAP.md) |
| Owner-only facts the agents may restyle but never change | [`content/`](content) |

## What binds and what guides

**Binding (GitHub),** once the owner's setup below is done. The team reaches GitHub as the owner
(see the residual risk below), so what binds is the checks. The `protect-main` ruleset requires:
- a pull request, and the owner's review wherever `.github/CODEOWNERS` names them;
- `check` (GitHub Actions): lint, typecheck, knip, build, harness tests and the end-to-end suite;
- `gate` (the team's checks app): it holds a PR that touches an owner path, changes
  `package.json`'s scripts, weakens a test or ever carried `needs-owner`, until the owner approves
  its current head. The checks app opens the team's PRs as drafts (`.github/workflows/open-pr.yml`),
  so nobody merges one mid-sprint, and marks them ready at the close-out (`ready-pr.yml`); the
  owner can approve them and merge them with the usual button. A PR under the owner's own login
  can't be approved by them (nobody can approve their own PR), so they decide it with the bypass;
- `lens` (the checks app): Claude Code reviews the PR as Lens and the check passes only on ship. A
  push that only touches the team's notes (the sprint folder's `.md` files and `retro.json`,
  `STATE.md`, `ROADMAP.md`) keeps the last ship.

Only the checks app can post `gate` and `lens`, and its key lives in a `checks` environment that
serves `main` alone, where both workflows run on `pull_request_target`. Lens reads the PR's code
outside its workspace and never runs it. The ruleset's one bypass is the owner's, for pull requests
only.

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

The daily cap is guidance, not binding: the pre-flight Atlas runs (`.crew/next-sprint.mjs`) stands
down once `THESEUS_DAILY_SPRINTS` (default 6) of the team's sprint PRs merged in the last 24 hours.
An open sprint PR is still finished at the cap. Each run also counts against the owner's
subscription usage and the routines' own hourly limits.

**Guidance (the hooks).** They keep the team in its lane without being a boundary: a file-edit
guard (owner paths, `e2e/` for Probe, each role's own memory), deny rules for the obvious (`pkill`,
`gh pr merge`, force pushes, the repository's admin endpoints), the builders' `pnpm verify` on stop, and a watchdog for a stalled lead. A shell command can get past
all of them.

**The residual risk.** In the cloud, every GitHub call goes through Claude's GitHub proxy with the
owner's connection, git pushes included, whatever token the session holds: a deliberately fake
token was answered as the owner (tested 2026-10-17). So a session can do anything the owner can,
approving a PR and the admin bypass included. `merge.mjs` refuses a PR whose required checks didn't
pass or that `gate` passed only on the owner's approval; the deny rules block the admin endpoints
and `gh pr merge`; and every merge goes on air in the Studio and in GitHub's audit log. None of
that stops a session set on misusing it. On a laptop the same
holds for the owner's own `gh` login.

## Setup (the owner, once, in this order)

1. **The checks app.** Create a GitHub App on your account (Settings → Developer settings), with
   its webhook off and these repository permissions: Checks read and write, Pull requests read
   and write, Contents read, Issues read. Install it on this repository only. Note its App ID and
   Client ID, and generate a private key.
2. **The `checks` environment.** In this repository: Settings → Environments → New environment
   `checks`, with deployment branches limited to `main`. Add the variable `CHECKS_APP_CLIENT_ID`
   and the secrets `CHECKS_APP_PRIVATE_KEY` and `CLAUDE_CODE_OAUTH_TOKEN`, then delete the
   repository-level `CLAUDE_CODE_OAUTH_TOKEN` secret.
3. **The team's cloud environment.** At claude.ai/code, create an environment for the team (say
   `theseus-team`) with the same network access and setup script as Default, and these variables:
   `STUDIO_INGEST_URL` and `NODE_USE_ENV_PROXY=1` as on Default. Add the same Studio ingest network
   secret as Default (`Authorization: Bearer …` for the ingest host).
4. **Point the routine at it.** Give the coordinator the environment's name, and it switches the
   routine through the routines API (or edit the routine yourself). The sprint pre-flight prints
   which account GitHub calls act as (`actingAs`).
5. **Merge the PR that adds this.** The ruleset still requires only `check`, and this PR's `gate`
   and `lens` don't run until their workflows are on `main`.
6. **Let the app report once.** Open or update any PR into `main`: `gate` posts its first check
   run, which the ruleset needs before it can name the app as a source.
7. **The ruleset.** Edit `protect-main`.
   - Required status checks: keep `check` (GitHub Actions), and add `gate` and `lens` with the
     checks app as their source.
   - "Require a pull request before merging": keep 0 approvals, and tick "Require review from Code
     Owners" and "Dismiss stale pull request approvals when new commits are pushed".
   - Bypass list: add the Repository admin role, set to "For pull requests only". That lets you
     merge your own PRs (no direct pushes). The team's PRs come from the checks app: approve
     those and merge them with the usual button, which keeps every required check.
8. **Check code-owner review.** GitHub doesn't document how code-owner review behaves with 0
   approvals. A team PR that touches only `app/` should merge without your review, and one that
   touches `.claude/` should wait for you. If every PR waits, untick "Require review from Code
   Owners": `gate` still holds owner paths until you merge them.
9. **The routine's triggers.** At claude.ai/code/routines, edit `theseus-sprint`.
   - The prompt: "If a github-trigger-context block names a pull request whose branch doesn't
     start with sprint/, or one that closed without merging (`gh api
     repos/nycruslan/theseus-portfolio/pulls/<number> --jq .merged` prints false), end now with
     one line saying so and run nothing: only a merged sprint starts the next one. Otherwise run
     /sprint. If a routine-fire-payload block is present, it holds the owner's goal for this
     sprint: pass its text to /sprint as the goal." The first sentence backs up the trigger's
     filters, which the routines API can't set: on 2026-10-17 the trigger fired for every closed
     PR, merged or not, whatever its branch. Saving this form can write back an older prompt and
     drop the schedule, so check both after every save (`/schedule list` in the CLI).
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
   - The cap (optional): set `THESEUS_DAILY_SPRINTS` in the team's environment to change
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
