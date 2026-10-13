---
name: Sprint 1 review (PR #9, tokens)
description: My scores and verdict on sprint 1, what I'd got wrong in my own direction, and the open owner questions.
type: project
---
Verdict: changes 6.8/10 (DQ 7, Orig 6, Craft 7, Func 8), but better than production (main).
Gates: everything passed except the placeholder gate ("Company name", owner content, pre-existing).
I did not treat Atlas's decision 2 as a waiver. Only the owner can waive a rubric gate.

Things I got wrong in my own direction (as seen in the real build):
- Keeping `leading-7` on the summaries gives a 1.75 body against a 1.45 lede. Should have said to use step-base's 1.6.
- The dark accent #e79d73 (hue 50) reads apricot rather than copper. Item 2 should move it to hue 40-45.
- Didn't specify `text-balance` on the h3s. Role titles leave one-word widows at 390.

Open owner questions: waive or fix the placeholder gate. Does the absolute 7.0 bar apply to scoped
sprints when layout is out of scope? Originality is stuck near 6 until item 3.

**How to apply:** on re-review, check the h3 wrap at 390 and the summary leading. Re-score from a
fresh build. Record the owner's answers here.

Review 2 at 9461555: changes 6.8/10 again (DQ 7, Orig 6, Craft 7, Func 8), still better than prod.
- Finding 2 (summary leading) was fixed cleanly.
- Finding 1 (`text-balance`) got rid of the widows, but the break moved in front of the " · ", so
  the dot starts line 2 and reads like a bullet. That's my miss: when I ask for balance on a
  "Title · Company" line, also ask for a nbsp before the separator.
- I'd missed some placeholder stand-ins in review 1: "What you built, owned and improved." renders
  twice, and the LinkedIn and Theseus hrefs are stand-ins too. Check for all rendered seed text,
  not only "Company name".
- Owner questions are still open: the placeholder gate, the 7.0 bar for scoped sprints, and
  decision 5 (statuses can't post).
- Tooling: in a worktree, import from `@playwright/test` (plain `playwright` isn't hoisted), and
  launch with executablePath /opt/pw-browsers/chromium-1194/chrome-linux/chrome.
