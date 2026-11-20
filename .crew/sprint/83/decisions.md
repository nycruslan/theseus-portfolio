# Sprint 83: decisions

1. **The work (Atlas).** The roadmap stands down until a production defect says something false
   or hides a fact, and no owner goal came with this run. Sprint 82's sweep found nothing else
   left at the default font across the sitemap, so this run read the live layer, which no sweep
   pins: production's `/` and `/crew` read "Crew resting. Sprint 32 merged." and "Replay sprint
   32" after sprint 82 merged. Production's `/api/crew` (2026-11-20, read with curl) carries
   `"sprint": 32` beside the goal "Sprint 82 (S): the Log gives sprint 40's real merge time", PR
   #159 and `"mergedAt": null`. Sprint 32 merged on 31 Oct as #85; the site states a false fact on
   its first screen.

2. **The number comes from the Studio; the fix is ours to make (Atlas).** The crew doesn't work
   on the Studio, and the site takes the feed's sprint number as told. Our own record knows which
   sprint each merged PR was, so the site checks the feed's number against it rather than
   repeating a number the record contradicts. Likely cause on the Studio's side, for the owner:
   sprint 82's run touched `.crew/sprint/32/merge-record.mjs` before any `.crew/sprint/82/` path,
   as `.crew/STATE.md` tells every run to, and the feed seems to have taken its number from that
   path. Not verified: the Studio's code is outside this repository.
