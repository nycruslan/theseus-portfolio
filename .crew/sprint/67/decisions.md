# Sprint 67 decisions

## 1. Starting past the pre-flight's stand-down (Atlas)

`node .crew/next-sprint.mjs` said `stand down`: branches `sprint/66-probe` and `sprint/66-forge`
had no PR and commits under two hours old. They're sprint 66's role branches, named `sprint/…`
rather than `<role>/<n>`, and their work is on main: #134 squash-merged at 01:49 UTC, after their
last commits (00:47 and 00:02), and main's memory files hold their lines and more. No run was on
them, so this run took sprint 67. Roles push to `<role>/67` this sprint. The pre-flight counting a
merged sprint's role branches as in flight is the owner's to change (`.crew/` scripts), proposed
in this sprint's retro.

## 2. The sprint's shape (Atlas)

The milestone's last item is Quill's demo on production. Sprint 66's door follow-ups (Forge's 1
and 3, Probe's 2 in `.crew/sprint/66/retro.json`) touch the doors' code and would otherwise wait
for a sprint that does, so they ride along here, as sprint 61's did with the yard's demo.
