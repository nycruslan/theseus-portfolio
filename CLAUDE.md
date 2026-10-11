@AGENTS.md

# Team

This repository is rebuilt by an AI agent team, sprint by sprint, while visitors watch.

- **Lead (Atlas):** the main session. A sprint starts with `/sprint` (`.claude/skills/sprint/`).
- **Roles:** subagents in `.claude/agents/`.
- **Shared state:** `.studio/STATE.md` (progress log) and `ROADMAP.md` (what comes next).
- **Broadcast:** hooks in `.claude/settings.json` forward events to the Studio. Don't disable them.

## Hard rules

- Facts in `content/` belong to the owner. Never change them; only change how they are presented.
- Never push to `main`. Work on a branch and open a pull request.
- Keep each change small and verified: `pnpm lint` and `pnpm build` must pass.
