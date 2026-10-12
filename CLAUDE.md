@AGENTS.md

# Team

An AI agent team rebuilds this portfolio, sprint by sprint, while visitors watch. A sprint starts
with `/sprint`; Atlas, the lead, is the main session.

- **Roles** (`.claude/agents/`): Quill `product-owner`, Scout `researcher`, Iris `design-director`,
  Forge `engineer`, Pixel `creative-engineer`, Lens `code-reviewer`, Probe `qa-engineer`.
- **Writers:** the lead and the engineers change the repository. Everyone else returns their work
  to the lead (enforced by `.studio/guard.mjs`).
- **Shared state:** `.studio/STATE.md` (what the team learned), `ROADMAP.md` (what comes next),
  `.studio/sprint/<n>/` (each sprint's notes and decisions), `design/rubric.md` (the design bar).
- **Broadcast:** hooks in `.claude/settings.json` stream the team's work to the Studio.

## Merge policy

Atlas squash-merges its own sprint PR once the reviews pass and CI is green. Never push to `main`.

## The owner's facts

`content/` belongs to the owner: change how it's presented, never what it says.
