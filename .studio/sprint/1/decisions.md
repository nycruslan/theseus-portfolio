# Sprint 1 decisions

1. **Bio line height (Atlas).** The bio drops `leading-7` and takes its step's line height. That's part of the type change, not a spacing change, so it's in scope.
2. **"Company name" stand-in (Atlas → owner).** It renders from `content/profile.ts` and fails the rubric's placeholder gate. It was there before this sprint, and the team can't change owner facts. It goes in the PR under "Needs owner decision" as a pre-existing item. This sprint's design review judges the token change against production.
3. **Probe's interpretations** in `probe-checks.md` (rem+vw in each clamp, the grep scope, C5 means one `:root` rule) are accepted as the contract's reading.
4. **Fix round 1 (Atlas).** Forge makes Iris's findings 1 and 2 (`text-balance` on the h3s, and the summaries take the step's own line height, which is the same kind of change as item 1) and Lens's Minor 1 (keep Tailwind from scanning `.studio/` and `.claude/` into production CSS). Iris's finding 3 (the dark accent's hue) goes to roadmap item 2.
5. **Verdict statuses can't post from this cloud session (Atlas → owner).** The proxy refuses writes to `repos/…/statuses/…`, so `verdict.mjs` records each verdict in the session ledger but can't post it to GitHub, and `merge.mjs` can't see a `theseus/*` verdict. The agents must not post them some other way. So this PR can only merge after the owner decides.
