# Sprint 73: decisions

1. **T34 reads words against words, and holds the hint off every word on the page** (Probe, kept by
   Atlas). The contract said the hint ran into ← Sprint p and Next; Atlas's sweep measured the
   hint's text against the links' 44 px boxes. Word on word it never touches either step link; on
   `/log/70` it runs into the goal's h2 instead. So T34 adds a clause the contract didn't name:
   the hint's text runs into no other word deeper than at 16 px at the same width. The goal says
   the hint never prints over anything, so the clause serves it.
2. **The 16 px baseline is 0 px**, word on word, not the contract's "0 to 2 px" (Probe).
3. **The box diff isolates the CSS.** Main and this branch differ in content (sprint 72's merge
   record), so Atlas diffed the fix's build against the same build with main's four rules put back.
   The plan drawing's `.plan-plank` spans are left out, since they move between two reads of the
   same CSS.
4. **No Iris pass.** The 16 px look doesn't move and the large-font change is a taller line; Atlas
   read the screenshots.
5. **Forge's run was lost to a container restart** after it pushed `forge/73` (fix and memory).
   Atlas verified the fix itself (verify, 42 specs, box diff, screenshots) rather than run Forge
   again.
