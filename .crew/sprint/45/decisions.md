# Sprint 45: decisions (Atlas)

1. **Wc, as the roadmap orders.** The pre-flight said start sprint 45, nothing open, no owner goal,
   5 of 6 sprints merged today. Wc is the milestone's last sprint and needs no owner answer.
2. **Sized M, not the plan's S.** Measured on production (c387811), 1024 × 640 has the contact
   links below the fold too (751), not only the particulars, and the fix is a placement on the
   sheet from 1024 to 1279 plus a line for the key from 1024 to 1439: two of Iris's calls and new
   checks, so it runs as Wa and Wb did, with a contract, Iris first and Probe's checks red first.
3. **Atlas wrote the contract from Quill's plan** (`.crew/sprint/42/plan.md`, Wc, W13 to W15),
   adding W16 (the drawing whole and the model landing, Wa's W3 and W4 at the new windows) and W17
   (still), the budgets every sprint in the milestone carries.
4. **Iris's placement call and Probe's red checks run in parallel,** as in sprints 43 and 44:
   W13 to W17 hold whatever the option; the floor waits on Iris, so Probe keeps it in one constant.
5. **Iris's call taken** (`placement.md`, aeed248): Wa's short layout reaches down to 1024 under
   960 px tall, the particulars beside the drawing, the floor 240 px as Wa's; the key under the
   table at every width from 1024, two lines below 1248. Built on her call without waiting; it can
   be undone. Her sweep finds two windows outside the contract's set, 1220 × 640 and 1247 × 640,
   where the floor holds and the links end 1.4 and 2.6 px under the fold: accepted and reported,
   since the drawing's floor is the milestone's rule ("the drawing gives up height", never below
   the floor) and no common window sits there.
6. **Forge builds as soon as Probe's checks land** (12ad866), before Probe's report, as STATE's
   lesson on overlapping notes, checks and build says.
7. **Probe's checks taken** (12ad866): W13 and W14 red on the branch as the contract predicts; W16
   and W17 are guards main already meets (the drawing whole, the model landing, nothing shifting),
   so they can't be red before the build and need no mutant. W15's split ran the 7 default-server
   passes green under `PLAYWRIGHT_BASE_URL`. No kept check pins the key hidden, so nothing retires;
   W7 grows stricter by itself (print and forced colours must now show the key at 1366 × 625), and
   only its comment at `e2e/window.spec.ts:1186` goes stale, for Probe after the build.
8. **Forge's build taken** (b09ec3b, memory 2ed80a8): Iris's CSS with two departures, both sent
   to Iris for a yes or no. The floor's width rounds up to a whole pixel, since Chromium's
   64th-of-a-pixel rounding left the drawing at 239.984 under W16's 240 floor. The particulars' film
   fill reaches 2 px left of their text (margin less 2 px, nothing visible moves), since a fill
   edge half a pixel past a whole pixel leaves the first glyphs outside it and CI's LCD text turns
   grayscale over the model (reproduced with sprint 39's fontconfig: 8,745 px at 1180 × 740, 0
   after). `pnpm verify` passes on the integrated tree; Forge's full suite: 328 of 328 on 2 workers.
   Wa's rule from 1280 has the same two latent problems on unchanged code (LCD loss at 1300 × 650,
   which no check reads); a follow-up, not this sprint's.
9. **Iris: ship, yes to both departures** (on 41552f7; her table matches Forge's to 0.1 px, 273
   windows swept per state, only the accepted 1247 × 640). Her one edit taken before the review
   label: the floor's width as `calc(var(--plan-floor) / 0.33807 + 0.1px)`, not `round()`, which
   would be the site's first need for Chrome 125 (the site otherwise needs 108), and without which
   the drawing goes full width under the particulars. Same geometry in both engines. Forge makes it.
10. **Forge's floor fix taken** (c0bbed4, memory ef8feb6): the sum in place of `round()`; verify
    passes, `tablet-window`, `window` and `phone-window` specs 22 of 22, the geometry Iris's.
11. **Lens: changes on 366dbb9, one Important: the contract's W15 was wrong to list W2 and P9.**
    Their default-server passes assert the feed's down state, which a deployed site under
    `PLAYWRIGHT_BASE_URL` never shows (sprint 34 decision 7 guarded them for that); Probe's proof
    ran on a local `next start` with no feed, still the down state. Contract change: W15 covers P3,
    P8, W1 and W8 (and W13, W14); W2's and P9's default passes go back inside their guards. Fix
    round 1 to Probe, with Lens's cheap nits riding (W14 reads 1000 tall, `window.ts`'s header says
    "copied") and Forge's comment nit at `app/globals.css:1483`. CI is unaffected either way.
12. **Fix round 1 taken** (Probe 91bb85a, Forge b7ec116): W2 and P9 back to main's text inside
    their guards, no new skip; Lens's nits taken. Touched specs 34 of 34 on a fresh build; under
    `PLAYWRIGHT_BASE_URL` 8 passed, 10 skipped, 0 failed (a local server, no feed). `expect(` counts
    unchanged.
