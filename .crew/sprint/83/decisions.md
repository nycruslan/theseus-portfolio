# Sprint 83: decisions

1. **The work (Atlas).** The roadmap stands down until a production defect says something false
   or hides a fact, and no owner goal came with this run. Sprint 82's sweep found nothing else
   left at the default font across the sitemap, so this run read the live layer, which no sweep
   pins: production's `/` and `/crew` read "Crew resting. Sprint 32 merged." and "Replay sprint
   32" after sprint 82 merged. Production's `/api/crew` (2026-11-20, read with curl) carries
   `"sprint": 32` beside the goal "Sprint 82 (S): the Log gives sprint 40's real merge time", PR
   #159 and `"mergedAt": null`. Sprint 32 merged on 25 Oct as #82 (`.crew/sprint/32/merge.json`); the site states a false fact on
   its first screen.

2. **The number comes from the Studio; the fix is ours to make (Atlas).** The crew doesn't work
   on the Studio, and the site takes the feed's sprint number as told. Our own record knows which
   sprint each merged PR was, so the site checks the feed's number against it rather than
   repeating a number the record contradicts. Likely cause on the Studio's side, for the owner:
   sprint 82's run touched `.crew/sprint/32/merge-record.mjs` before any `.crew/sprint/82/` path,
   as `.crew/STATE.md` tells every run to, and the feed seems to have taken its number from that
   path. Not verified: the Studio's code is outside this repository.

3. **The rule, in one place (Forge).** `lib/crew-feed.ts`'s `sprintOf`, applied in `crewOf`
   before the run's rules read the run: a run whose pull request the record holds (a retro's `pr`)
   is that sprint; one whose pull request the record doesn't hold keeps its number unless the
   record has that sprint under another pull request, and then the site tells no number (the
   existing paths: "Crew resting." without a replay, no pencil on `/`). Only a pull request the
   site would link counts (`pullHref`), so the suite's fixtures, which name other repositories'
   numbers, keep theirs. The browser reads `/api/crew`, which goes through `readCrew`, so the poll
   can't bring the wrong number back. No goal text is parsed.

4. **Accepted gap (Atlas).** A live run before its pull request opens has no PR to check, so a
   merged sprint's number from the feed still draws a pencil on that merged plank for those
   minutes. Closing it would mean moving the fixtures' in-progress numbers off merged sprints
   (live.json's 31, crew-model's and window's patches): an M with Probe, not this S. Follow-up.

5. **No new check in this S (Atlas).** The kept suite stays green; Forge proved the rule on real
   builds against a stub serving production's saved answer, before and after. A check pinning it
   is Probe's follow-up, with Forge's two variants (a held PR with a wrong number, an unknown PR
   with a merged number).

6. **The retro's goal, shortened (Atlas).** CI's T37 went red on the close-out: the first goal,
   72 characters, wrapped /log/83's heading to 580.9 px in a 568 px window at 320. The goal is now
   "The first screen names the sprint that really merged"; T37 and P11 pass locally (21 passed). A
   B3.9 layout shift in shard 3 passed 3 of 3 locally on the same head and was re-run once.
