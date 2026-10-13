# Sprint 1 decisions

1. **Bio line height (Atlas).** The bio drops `leading-7` and takes its step's line height. That's part of the type change, not a spacing change, so it's in scope.
2. **"Company name" stand-in (Atlas → owner).** It renders from `content/profile.ts` and fails the rubric's placeholder gate. It was there before this sprint, and the team can't change owner facts. It goes in the PR under "Needs owner decision" as a pre-existing item. This sprint's design review judges the token change against production.
3. **Probe's interpretations** in `probe-checks.md` (rem+vw in each clamp, the grep scope, C5 means one `:root` rule) are accepted as the contract's reading.
