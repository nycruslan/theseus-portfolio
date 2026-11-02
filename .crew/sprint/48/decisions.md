# Sprint 48: decisions (Atlas)

1. **Kb, as the roadmap's Next line says.** The pre-flight said start sprint 48, nothing open, no
   owner goal (5 of 6 daily merges used). No `update`, `remind` or `picks`.
2. **Run as M, not S.** The plan sized Kb S, but P8, B2.3 and `live-layer.spec.ts`'s Tab-order read
   pin the key as link-free and the stops exactly, and `e2e/` is Probe's. So Probe writes K9 to K12
   and the rewrites while Forge builds, in parallel, from selectors briefed to both word for word
   (`p[data-keel-record]`, `a[href="/crew#keel"]` in the key, `a[href="#keel"]` in Approval).
3. **The contract greps the link allowlists first** (STATE.md's sprint 47 lesson). B4.8 already
   allows `#…` hrefs on `/crew`; `live-layer.spec.ts:1628–1655` counts the Log link's distance from
   the Contact links and would go red, so the contract names it beside P8 and B2.3.
4. **Five more kept checks bound the key's link,** found by Forge's full run and Probe's: B2.9
   (24 px targets; met with `py-1` on the inline link, B2.9 unedited), B5.25 (`/log`'s Tab walk),
   B5.6 (`/log`'s link allowlist), B5.9 (`/log/13`'s link order), and on `/crew` B4.8's panel-links
   list. The key renders on `/log` and every record too (`components/log.tsx`, shared `CrewKey`).
   Probe rewrote each with its strength (exact list, one new stop in one place); the PR names them.
5. **Iris: ship, 7.8.** Her one cheap fix rides this round: `whitespace-nowrap` on the inline
   link, so "his rules" never splits into sub-24 px fragments. Her follow-up (the 2 px ring around
   an inline link touches neighbouring lines; fixing it needs Probe's ring checks rewritten) and her
   idea (the record line linking to `/log`) go to the roadmap.
