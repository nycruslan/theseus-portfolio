# Sprint 16 contract: B1, the hero

Size: M (a big one), on the contract the owner accepted by merging PR #47. The checks are sprint 15's,
unchanged: `.studio/sprint/15/contract.md`, "B1 checks", 1 to 11. This page only fixes what this sprint
ships and in what order.

## Outcome

`/` opens on the log of the Theseus: the name in Besley at 136 / 64 px, the ruled title band (headline,
city, "Build log · N sprints"), the bio in columns 7 to 12, and a stern-cropped hull of 22 planks toned
from `readSprintLog()` through the ORDER table, copper for the newest, in HTML before any script. The
canvas takes over at rest at the same pose. Libre Franklin replaces Geist site-wide. The rest of the page
stays today's column.

## Checks

1 to 11 as written in `.studio/sprint/15/contract.md`. Probe writes them red first, together with the
rewrites that contract lists under "Rewritten, every assertion kept". Probe's spike comes before the
specs: the renderer at a 1460 px hull, the DPR cap, the hero chunk's bytes, and today's first-load JS
for `/`, written into `spike-probe.md`.

## Owner decisions this sprint relies on

The owner merged #47, which carried Quill's recommended answers to its 11 decisions. This sprint reads
that as: decisions 1, 2, 4, 6 and 10 taken as recommended. Decision 7 (the spec retirements listed under
"Would weaken a check") is still asked again on this PR's head, since `gate` holds any weakened test for
the owner's approval anyway; the PR carries `needs-owner` and lists every retired assertion. Decision 9
(markup cap) and 11 (the 1460 px cap above 1441 px: kept, as the direction draws it) are asked only if the
build needs them.

## Out of scope

As sprint 15's contract says for B1: `content/`, the nav, h2s, rows, ship scene, stage, seating, yaw,
view transition; Besley on `/sprints`; `.github/` and `.claude/` (apart from memory).

## Cut order

If the build overruns: nothing from checks 1 to 9 is cut. The canvas (check 10) is cut only with the
owner's yes, asked in the PR.
