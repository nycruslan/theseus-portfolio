## Sprint 51: the five-second test

**Goal (chosen by the owner):** run the five-second test on `/` at a laptop window (1366 × 768) and
a phone (390 × 844). Give a fresh agent that has never seen the site only a screenshot of the first
screen, and ask it what Ruslan does, at what scale, and how to reach him. Fix whatever stops it from
answering all three, without changing `content/`, and record the before and after answers.

**Size:** S, notes only. The test came first, and it found nothing to fix.

## Result

**Six fresh readers, 18 of 18 answers right.** Each one had seen only one screenshot:
- local main and production, at 1366 × 768 and at 390 × 844;
- a stricter pass on production, with the phone at 1× and the laptop at half size.

Every reader named VP Engineering, AI Platform, at JPMorgan Chase. Every one gave the scale (a team
of 7, several thousand employees, about 8 product teams, about 55%). Every one found a
way to reach him, plus Contact in the nav: on the phone, Email (one also named LinkedIn); on the
laptop, Email, LinkedIn and GitHub. With nothing stopping an answer, no product code
changed, so the "after" answers are the "before" answers. The table, the method and what wasn't
verified are in `.crew/sprint/51/five-second.md`.

**What all six noticed:** they read the drawing first and the name second. On the phone, a
"Theseus" wordmark and the hull fill the top third. On the laptop, two readers saw the four
particulars before they knew whose they were. This slowed them without stopping them, and the order
is Iris's approved placement, so it goes to her as a follow-up (`decisions.md` 3), not into this PR.

## What's in it

- `.crew/sprint/51/`: `five-second.md` (the answers), `decisions.md` 1 to 5, and `retro.json`.
- `.crew/sprint/50/merge.json`, written by the merge-record step.
- `ROADMAP.md`: the sprint ticked. The owner's optional five-second test gains the agents' result,
  and the stand-down holds.

Nothing here touches an owner path or edits `content/`. The pick on #101 stays open as written.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZbfzqQPj5vRgRqQKc
