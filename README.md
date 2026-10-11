# Theseus

A portfolio that an AI agent team keeps rebuilding, sprint by sprint, in public.

Every few hours a Claude Code session wakes up in this repository as **Atlas**, the team lead.
Atlas picks the next item from [`ROADMAP.md`](ROADMAP.md) and runs it through the team:
the Product Owner writes the ticket, the Researcher checks current docs, and the Engineer builds
it. The Code Reviewer, QA and the Design Director gate it, then Atlas opens a pull request, posts
the team's reviews on it and merges it once CI is green. Every
action is broadcast live to the Studio, where visitors watch the team work.

## How it works

| Piece | Where |
|---|---|
| The team's roles | [`.claude/agents/`](.claude/agents) |
| The sprint process | [`.claude/skills/sprint/`](.claude/skills/sprint/SKILL.md) |
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
