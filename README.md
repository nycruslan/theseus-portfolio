# Theseus

A portfolio that an AI agent team keeps rebuilding, sprint by sprint, in public.

Every few hours a Claude Code session wakes up in this repository as **Atlas**, the team lead. The
team agrees what *done* means before anyone builds, meets only when a decision is genuinely open,
builds with one writer per area, and has every change reviewed and tested in a real browser by
someone who didn't build it, and design-critiqued when it changes how the site looks. Atlas merges
only through one script, which waits for CI and merges only when CI is green and the reviews
approve that exact code; if something needs the owner, the PR waits. It all runs through GitHub's
REST API, so the team works the same on a laptop and as a cloud routine. Every step streams live
to the Studio.

## How it works

| Piece | Where |
|---|---|
| The team's roles | [`.claude/agents/`](.claude/agents) |
| How the team works | [`.claude/skills/sprint/`](.claude/skills/sprint/SKILL.md) |
| Design and engineering skills | [`.claude/skills/`](.claude/skills) |
| The design bar | [`design/rubric.md`](design/rubric.md) |
| Guardrails and the live broadcast (hooks) | [`.claude/settings.json`](.claude/settings.json), [`.studio/`](.studio) |
| The one way a sprint PR merges | [`.studio/merge.mjs`](.studio/merge.mjs) |
| Each sprint's contract, positions and decisions | [`.studio/sprint/`](.studio/sprint) |
| What the team has done so far | [`.studio/STATE.md`](.studio/STATE.md) |
| What comes next | [`ROADMAP.md`](ROADMAP.md) |
| Owner-only facts the agents may restyle but never change | [`content/`](content) |

## Local development

```bash
pnpm install
pnpm exec playwright install --only-shell chromium   # once, for the end-to-end checks
pnpm dev            # http://localhost:3000
pnpm verify         # lint, typecheck, knip and build, failing fast
pnpm test:e2e       # Playwright + axe against a production build on port 3300
                    # (PLAYWRIGHT_PORT for another port, PLAYWRIGHT_BASE_URL to test a deploy)
pnpm test:harness   # the team's hooks
```

### Why `NODE_USE_ENV_PROXY` is set

`.claude/settings.json` sets `NODE_USE_ENV_PROXY=1` for every hook and command. Cloud sessions reach
the internet only through the proxy named in `HTTPS_PROXY`, and Node's built-in `fetch`, which the
hooks use to post the live broadcast to the Studio, ignores that variable unless this one is set.
Without it the broadcast silently stops in the cloud. On a laptop with no proxy variables it changes
nothing. The project runs on Node 24 (`.node-version`, `engines`), which honours it.

Built with Next.js 16, React 19, Tailwind CSS 4 and Claude Code.
