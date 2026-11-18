## Sprint 76 (S): the trials page logs nothing

**Goal** (from the roadmap's stand-down, chosen by Atlas): a peer who opens the console on `/trials`
sees no errors. On production every trials view logs 48 in Chromium ("Blocked script execution in
'…/trials/frame' because the document's frame is sandboxed…"), measured 2026-11-18 at 1440 × 900 on
`/trials` and `/trials/320x568`; `/`, `/log`, `/crew`, `/ask` and `/evals` log 0. Open since
sprint 67's demo.

**Size:** S. Contract: `.crew/sprint/76/contract.md` (T36).

Building: Forge serves `/trials/frame` without script tags; Probe writes T36.
