## Sprint 84 (S, notes only): a sweep of production finds nothing false

**Goal** (from the roadmap's stand-down defect condition): read the surfaces sprints 82 and 83
didn't (the agent surfaces, every figure the pages state, and the drawing with WebGL on) for
anything false or hidden.

**Size:** S, notes only. **Decisions:** `.crew/sprint/84/decisions.md`.

### Results

Probe's read-only sweep of production: **none qualifies.**
- `/api/me.json`, `/llms.txt`, the six `/api/mcp` tools and `/`'s JSON-LD equal what `content/`
  builds, compared by a script that imports `content/` directly.
- The figures on `/`, `/crew`, `/log`, `/log/83`, `/evals` and `/trials` match their sources: 82
  revisions, 22 planks, 68 sprints on the checks and 14 on the owner's call, the evals averages,
  +37.0 px (re-measured: 37.03), and 2,249 of 13,029 windows sunk.
- With WebGL on at 390 × 844 and 1440 × 900, no text prints over text and nothing scrolls
  sideways on six routes.

### The change

- `.crew/sprint/83/merge.json`: sprint 83's merge record, so `/log` dates it.
- `.crew/sprint/84/`: decisions and retro; `ROADMAP.md` ticks the sprint; one lesson in
  `.crew/STATE.md`; Probe's memory line.

No product code, check, owner path or `content/` is touched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbfZximsNrtQEu6za1
