# Sprint 45: the sheet fits a tablet window, and the key shows (Wc)

**Goal** (from the roadmap, milestone "the proof in the first window", sprint Wc): from 1024 to
1279 wide, the first window holds the name, role, lead, contact links and the four particulars,
and from 1024 to 1439 the crew key shows under the revisions.

**Size:** M (the plan said S; `.crew/sprint/45/decisions.md` 2 says why).

**Contract:** `.crew/sprint/45/contract.md`, W13 to W17, in `e2e/tablet-window.spec.ts`. All
green on the build. CI's `check` on 9ca62e2 passed in 27 min 11 s, under its 35 (#107: 24 min 23 s
in the suite); the new spec takes 34 s on 2 workers. W13 and W14 were red on the branch before the build; W16 and W17
guard what main already did. Measured on the integrated build (Chromium 156, WebGL refused):

| Window | Contact links end | Particulars | Key |
|---|---|---|---|
| 1024 × 640 | 632 | 120–296 | 582–621 (2 lines) |
| 1024 × 768 | 632 | 120–296 | 582–621 |
| 1180 × 740 | 697 | 177–354 | 617–656 (2 lines) |
| 1280 × 680 | 634 | 212–336 | 601–620 |
| 1366 × 625 | 607 | 199–305 | 570–589 |

Before (production, c387811): at 1024 × 640 the links ended at 751 and the particulars at 847,
and the key was hidden from 1024 to 1439.

**The placement** is Iris's (`.crew/sprint/45/placement.md`): under 960 px tall, Wa's short layout
reaches down to 1024 (the drawing gives way to its 240 px floor, the particulars stand beside it);
the key sits under the table at every width. At 1440 × 900 nothing moves (W2, unedited).

**For Lens:**
- No check retires. W7 grows stricter by itself (print and forced colours must now show the key
  at 1366 × 625).
- W15 splits P3's, P8's, W1's and W8's default-server passes out of their
  `PLAYWRIGHT_BASE_URL` skips (W2's and P9's stay guarded: they read the feed's down state, which
  a deployment never shows; Lens's Important on 366dbb9, decisions.md 11); `scope.mjs` will flag two added `test.skip(` lines, both the same
  guard on fixture-only passes: P8's live-fixture test (`plain-words.spec.ts`) and the new spec's
  fixtures describe. No file has fewer `expect(` calls.
- W11's wording now says its resize read can't see a `hadRecentInput` shift (Lens's nit on #107);
  no assertion changed.
- Riders: Lens's nit at `app/globals.css` (the phone foot row's comment) is now true.
- Forge's two departures from Iris's CSS, both accepted by Iris (decisions.md 8, 9): the floor's
  width is `calc(var(--plan-floor) / 0.33807 + 0.1px)` so Chromium's 64th-px rounding can't land
  the drawing under 240, and the particulars' film fill reaches 2 px left of their text so CI's
  LCD text holds over the model.

- Fix round 1 (decisions.md 12): W2 and P9 back to main's text inside their guards; W14 also
  reads 1000 tall; `window.ts` says what moved and what was copied, and the older specs import the
  moved helpers; the tablet foot's comment says where it steps.

**Iris:** ship (decisions.md 9). **Lens:** ship on 9ca62e2, two nits for the next sprint that
touches their code (the retro's follow-ups).

**Left open:** at 1220 × 640 and 1247 × 640, outside the contract's windows, the floor holds and
the links end 1.4 and 2.6 px under the fold (decisions.md 5). Wa's rule from 1280 loses LCD text
over the model at 1300 × 650 on unchanged code, and B3.1 reads the hand-off only at 1440 and 390
(decisions.md 8). Safari on a real tablet.

**Decisions:** `.crew/sprint/45/decisions.md`.

Nothing here touches an owner path or `content/`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvaAZvKEPMRLoiJorRm
