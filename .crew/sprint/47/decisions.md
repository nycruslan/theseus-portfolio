# Sprint 47: decisions (Atlas)

1. **Ka, as the roadmap's Next line says.** The pre-flight said start sprint 47, with nothing open.
   Iris made the placement call while Probe wrote K1 to K7 red and Forge built the library and the
   build-time mechanism, all three in parallel. The interface in `briefs.md` was written down
   before any of them started.
2. **Placement (a), Iris's call** (`placement.md`). (b) ends the drawing's sticky range, which K7
   forbids. The keel is about 1,107 px tall at 1440, not the plan's 450 px. It starts at y 844 on
   the default server at 1440 × 900, so its top rule shows in the first window. The LCP element and
   CLS are unchanged (Forge's measurements).
3. **Rules 5 and 6's sentences are Iris's.** Rule 5's "can't" became "don't". That narrows the
   wording toward what's true, since its label says a shell command can get around the guard. Rule
   6 says the same thing in plainer words. Neither changes a claim, so the contract's limit holds.
4. **B4.8 is rewritten, not weakened.** The contract's links (K1, K2) and B4.8's href allowlist
   couldn't both pass. Forge stopped on it, as the contract says a red kept check should. The
   rewrite allows the one blob-line pattern only inside the keel, requires exactly six, and leaves
   every other href to the unchanged rule. Lens judges it from the PR's notes.
5. **K6's 0.5 px tolerance stays.** At 1024 the model's canvas is sized in whole pixels (567 px for
   a 566.84 px box) and reaches 0.16 px past the column's edge. It does the same against the panel
   on main. Probe measured it and added a comment saying why.
6. **Probe's finding on sticky grid items.** placement.md says a sticky grid item sticks only
   inside its own grid area. In Chromium a one-row drawing still stuck along the keel, so K7 can't
   tell the two apart there. The two-row `grid-area` stays, since it's harmless and other engines
   may need it.
7. **Not verified here:** the `protect-main` ruleset's three required checks. Reading rulesets was
   refused in this session. `merge.mjs`'s wait on this PR shows the required checks, and I record
   them at the close.
8. **Lens: changes on 7b0402a, then ship on c513950.** The one Important finding was that
   `keel.spec.ts:1283`'s added skip wasn't named in the PR. I named it with its reason, and no code
   changed. Three cheap nits rode along in the fix round: B4.8's title, Forge's `crew.md` line and
   Iris's sticky-grid memory line. Lens's two nits on c513950 (`LINK` into its own module, and
   `globals.css`'s comment on the two-row span) only move code, so they ride with Kb.
9. **The Vercel preview didn't build** (Vercel's build rate limit), so nobody saw the keel on a
   deployment before the merge. Iris compared head and main on local builds with the same live
   fixture. Production after the merge is the first deployment.
10. **Fix round 2: K7 pinned boxes that every retro's goal moves.** CI's `check` on 77c75ee
    failed only in K7: sprint 47's one-line goal lifted the table 25.5 px against main's
    recording. Probe now reads the table's and the rules' tops from the retro text above them, and
    proved it with both goals and two mutants. This is the last fix round the skill allows. If
    this one fails, the scope gets cut.
