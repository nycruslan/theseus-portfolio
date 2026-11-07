# Sprint 51: the five-second test

The owner's goal: run the five-second test on `/` at a laptop window (1366 × 768) and a phone
(390 × 844). Give a fresh agent that has never seen the site only a screenshot of the first
screen, and ask it what Ruslan does, at what scale, and how to reach him. Fix whatever stops it
from answering all three correctly, without changing what `content/` says. Record the before and
after answers here.

**Result: all six readers answered all three questions correctly, so nothing was changed.** The
"after" answers are the "before" answers. What the readers say slowed them down didn't stop any of
them, and it goes to Iris and the owner below rather than into a fix this goal doesn't call for.

## Method

- Screenshots of `/`'s first screen, nothing below the fold, in Chromium 1243 (Playwright), each
  2.5 s after `load`, in the default Full motion state:
  - `a1` and `a2`: a local `next start` of main at 30e105f, which shows the feed's down state.
  - `a3` and `a4`: production, https://theseus-portfolio.vercel.app (200), with the live feed.
  - `b1` and `b2`, the strict pass on production: the phone at 1× (the 3× shots resolve more than a
    glance does) and the laptop scaled to half size, 683 × 384.
- One fresh `general-purpose` agent per screenshot, six in all. None had seen the site, the repo
  or another screenshot. Each was told to read only its one image and not to run or search
  anything. It answered the three questions from what was visible, said "can't tell" where the
  image didn't show it, and gave one line on what slowed it down.
- Scored against `content/profile.ts`: VP Engineering, AI Platform, at JPMorgan Chase; a team of 7,
  several thousand employees, about 8 product teams on the gateway, about 55% less manual
  processing; Email, LinkedIn and GitHub links.

## The answers (before, and after, since nothing changed)

| Shot | Window | Does | Scale | Reach | Slowed it |
| --- | --- | --- | --- | --- | --- |
| a1 | 1366 × 768, local | ✓ VP Eng, AI Platform, JPMorgan Chase | ✓ 7; several thousand; ~8 teams; ~55% | ✓ Email, LinkedIn, GitHub bottom right; Contact in nav | The name and role sit bottom right, and the drawing and Revisions take the eye first. The facts beside the drawing aren't labelled as his, so it wasn't sure at first whose numbers they were |
| a2 | 390 × 844 @3×, local | ✓ | ✓ 7; several thousand; ~8 teams; ~55% | ✓ Email mid-screen under the bio; Contact in nav | "Theseus", a ship drawing and Full / Calm / Off fill the top third, so it first looked like a boat project. The name comes after |
| a3 | 1366 × 768, production | ✓ | ✓ 7; several thousand; ~8 teams; ~55% | ✓ Email, LinkedIn, GitHub bottom right; Contact in nav | The drawing and Revisions take most of the screen, so it read the Leads / Reach rows before it knew whose they were |
| a4 | 390 × 844 @3×, production | ✓ | ✓ 7; several thousand; ~8 teams; ~55% | ✓ Email or LinkedIn under the bio; Contact in nav | The top third is a hull under "Theseus", so it couldn't tell whose site this was until the name |
| b1 | 390 × 844 @1×, production | ✓ | ✓ 7; several thousand; ~8 teams; ~55% | ✓ Email under the bio, mid-screen; Contact in nav | The hull, "Theseus" and the toggles take the top third, and it couldn't tell what "Theseus" means |
| b2 | 1366 × 768 at half size, production | ✓ | ✓ 7; several thousand; ~8 teams; ~55% (it said 8 teams "build on" the platform, where the site says "route through" the gateway: close, not wrong) | ✓ Email, LinkedIn, GitHub bottom right; Contact in nav | It read the drawing and Revisions first, and they mean nothing to a stranger. The name and role are found last |

Six of six answered all three: 18 of 18 answers right. The readers' own words are in this sprint's
session transcript. The screenshots stay out of git (the skill's rule) and were in the run's
scratchpad.

## What every reader noticed, and why it isn't fixed here

All six read the drawing first and the name second. On the laptop the name block sits bottom right,
under the drawing and beside Revisions. On the phone it comes after a drawing and a "Theseus"
wordmark that a stranger can't place. Two laptop readers saw the four particulars before they knew
whose they were.

Nothing here stopped an answer, and the owner's goal asks to fix only what does. The order is the
approved direction: the drawing leads, and the title block sits where a draughtsman's would.
Iris set the placement in sprints 43 and 44 (`.crew/sprint/43/placement.md`,
`.crew/sprint/44/placement.md`). Reordering it is a design call for Iris and an L-sized change, not
a fix this goal names. It is recorded as a follow-up for her (`decisions.md` 3).

## Not verified

- A real person, which is the owner's version of this test (still listed as his, optional, in
  `ROADMAP.md`). An agent reading a still image never misses a line, and a person in five seconds
  can.
- The Calm and Off states, Read as page, scripts off, and ruslanshulga.com itself.
- Safari, Firefox and a real phone. Chromium's iPhone emulation stood in.
