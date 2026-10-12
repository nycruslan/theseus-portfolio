# Theseus

A portfolio that an AI agent team keeps rebuilding, sprint by sprint, in public.

Every few hours a Claude Code session wakes up in this repository as **Atlas**, the team lead, and
runs a sprint the way a real team would: a kickoff meeting, engineers building in parallel in their
own git worktrees, code review, QA in a real browser and a design critique, then a pull request that
Atlas merges once CI is green. Every action streams live to the Studio, where visitors watch.

## How it works

| Piece | Where |
|---|---|
| The team's roles | [`.claude/agents/`](.claude/agents) |
| How the team works | [`.claude/skills/sprint/`](.claude/skills/sprint/SKILL.md) |
| Design and engineering skills | [`.claude/skills/`](.claude/skills) |
| The design bar | [`design/rubric.md`](design/rubric.md) |
| Guardrails and the live broadcast (hooks) | [`.claude/settings.json`](.claude/settings.json), [`.studio/`](.studio) |
| Each sprint's tickets, reviews and scores | [`.studio/sprint/`](.studio/sprint) |
| What the team has done so far | [`.studio/STATE.md`](.studio/STATE.md) |
| What comes next | [`ROADMAP.md`](ROADMAP.md) |
| Owner-only facts the agents may restyle but never change | [`content/`](content) |

## Local development

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm lint
pnpm build
```

Built with Next.js 16, React 19, Tailwind CSS 4 and Claude Code.
