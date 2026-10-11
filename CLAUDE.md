@AGENTS.md

# Team

This repository is rebuilt by an AI agent team, sprint by sprint, while visitors watch.

- **Atlas, Lead:** the main session. A sprint starts with `/sprint` (`.claude/skills/sprint/`).
- **Roles** (`.claude/agents/`): Quill `product-owner`, Scout `researcher`, Forge `engineer`,
  Lens `code-reviewer`, Probe `qa-engineer`, Iris `design-director`.
- **Single writer:** only the Lead and the engineer edit the repository. Other roles return their
  work to the Lead (enforced by `.studio/guard.mjs`).
- **Shared state:** `.studio/STATE.md` (progress log), `ROADMAP.md` (what comes next),
  `.studio/sprint/<n>/` (each sprint's paper trail), `design/rubric.md` (the design bar).
- **Broadcast:** hooks in `.claude/settings.json` forward events to the Studio. Don't disable them.

## Browser checks

Use the pinned agent-browser, always in a named session so agents don't share a browser:

```bash
pnpm exec agent-browser --session <name> open http://localhost:3100
pnpm exec agent-browser --session <name> snapshot -i
pnpm exec agent-browser --session <name> close
```

## Hard rules

- Facts in `content/` belong to the owner. Never change them; only change how they are presented.
- Never push to `main`. Work on a `claude/` branch and open a PR. Only Atlas merges, and only its
  own sprint PR after review, QA, design review and CI all pass.
- Keep each change small and verified: `pnpm lint` and `pnpm build` must pass.
