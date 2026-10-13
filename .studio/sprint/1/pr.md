## Sprint 1: design tokens, a palette and a fluid type scale

**Goal:** roadmap item 1. **Size:** M. **Fix rounds:** 1.

A visitor sees the same page and the same words, now with a deliberate palette (pale verdigris
ground, copper only on links) and type that scales from 320 to 1440 px (the name goes from 48 to
76 px). Every size and colour comes from 5 colour tokens and 5 `clamp()` steps in
`app/globals.css`. Tailwind now scans only `app/` and `components/`, so the team's notes no longer
leak into production CSS: 19.9 KB down to 10.3 KB.

- Contract: `.studio/sprint/1/contract.md`, checks C1 to C6 in `e2e/tokens.spec.ts`
- Design direction (Iris): `.studio/sprint/1/direction.md`
- Decisions: `.studio/sprint/1/decisions.md`
- Retro: `.studio/sprint/1/retro.json`

### Contract results at `9461555` (the reviewed code)
C1 to C6 all pass. `pnpm verify` passes, and `pnpm test:e2e` gives 15 passed and 1 skipped (the existing `TODO(owner)` fixme). CI `check` and `scope` are green.
Contrast against the background: light 14.5 / 6.2 / 6.1, dark 15.3 / 7.6 / 8.5 (foreground / muted / accent).

### Verdicts
| Reviewer | Round 1 (`4a28975`) | Round 2 (`9461555`) | Report |
|---|---|---|---|
| Lens | ship | ship | `review-lens.md`, `review-lens-2.md` |
| Probe | ship | ship | `verify-probe.md`, `verify-probe-2.md` |
| Iris (advisory) | changes 6.8 | changes 6.8 | `review-iris.md`, `review-iris-2.md` |

Iris rates the change **better than production**. Her `changes` comes from owner content (the placeholder gate) and from the 7.0 bar, which a layout-frozen sprint can't reach.

## Needs owner decision
1. **The verdict statuses can't post from cloud routines.** The session's GitHub proxy refuses `POST …/statuses/…` ("Write access to this GitHub API path is not permitted through this proxy"). `verdict.mjs` recorded each verdict in the session ledger, but none reached GitHub, so `merge.mjs` can't merge this. The agents didn't work around it. Merge yourself if you accept the verdicts above, or enable status writes and re-run the reviewers.
2. **Placeholder gate.** "Company name", "Previous company" and "What you built, owned and improved." render from `content/profile.ts`, as they do on main. Replace them or waive the gate for owner-pending content.
3. **The rubric's 7.0 bar for scoped sprints.** Should "better than production, all gates pass, nothing under 6" pass a sprint that can't touch layout?

### Not verified
Production and the Vercel preview (the proxy blocks them; main built locally stood in for them), browsers other than Chromium, and a real phone.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01AXFgJaDtMc1ri744Ux4PQc
