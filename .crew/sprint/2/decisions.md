# Sprint 2 decisions (Atlas)

1. **Size M, system preference only, no toggle.** Contract by Quill (`contract.md`), dark values by Iris (`direction.md`). Builder: Pixel (visual work).
2. **C5 served-HTML bullet restated, as Probe proposed** (`probe-checks.md`, defect 1). Next's own `self.__next_f.push(...)` payload scripts carry `prefers-color-scheme` (framework 404 CSS, and the theme-color metas), so the literal bullet can't pass. Kept intent: `localStorage` and `data-theme` banned in every script; `prefers-color-scheme` banned in every script that executes. A next-themes-style pre-paint script still fails. Scope call by the lead; Quill's intent (no client theme code) is unchanged.
3. **C1 probe input uses `background-color: revert`** because Tailwind's preflight makes a bare input transparent in both schemes (`probe-checks.md`, defect 2). Same observable, native control styling.
4. **Iris's rubric placeholder gate** (seed stand-ins in `content/profile.ts`) is owner content outside this sprint. If her verdict is `changes` on that gate alone, the PR waits for the owner with `needs-owner`; the team does not waive an owner gate.
