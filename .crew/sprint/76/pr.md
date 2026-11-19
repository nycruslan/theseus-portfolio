## Sprint 76 (S): the trials page logs nothing

**Goal** (from the roadmap's stand-down, chosen by Atlas): a peer who opens the console on `/trials`
sees no errors. On production every trials view logged 48 errors in Chromium ("Blocked script
execution in '…/trials/frame' because the document's frame is sandboxed…"). That was measured on
2026-11-18 at 1440 × 900 on `/trials` and `/trials/320x568`, while `/`, `/log`, `/crew`, `/ask` and
`/evals` logged 0. It had been open since sprint 67's demo.

**Size:** S. Contract: `.crew/sprint/76/contract.md` (T36, new in `e2e/trials-console.spec.ts`).

### The change

- **Root cause:** an App Router page in Next 16.4.6 always ships the runtime. The frame's document
  carried 46 scripts, and the sandbox (no `allow-scripts`) refused each one.
- **The frame's new route:** `pages/trials/frame.tsx` serves it from the Pages Router, static, with
  `unstable_runtimeJS: false`. Its only `<script>` is `/`'s JSON-LD data block, which the sandbox
  never refuses and T2 requires.
- **Same frame:** the frame's `<main>` equals the old one byte for byte, and its document is 45 KB
  where it was 128 KB. Its headers are unchanged: CSP `frame-ancestors 'self'`, noindex, canonical
  to `/`.
- **One shared text face:** the `Sofia_Sans` call moved to `app/document.ts`, which the layout and
  the Pages Router files share (B1.10 wants one call).
- **Side effects:** `decisions.md` 2 and 3 record the approach and the inert renames on App Router
  pages.

- **Fix round 1, B5.7:** the close-out's row made `/log/67` B5.7's tenth row, and its heading opened
  under a phone's fold (877 px against 844). That was already true on production for 13 of 75
  records. On a record page below 1024, the Log's lines figure now follows the record. Every
  record's h2 opens in view at 390 × 844, and nothing moves at 1440 (`decisions.md` 4).

### Results

- **T36:** red on main, with 46 errors per view and 46 scripts in the frame. Green on the head.
- **Full suite:** 468 of 468 passed (Forge, on 0146079 with T36). After the fix, the 155 Log,
  large-font and fits checks pass (Forge, 811e077), and so does `pnpm verify`.
- **`pnpm verify`:** passes on the integrated tree (Atlas).
- **Screenshots:** 13 before/after pairs (page, frame box, frame top-level, dark mode) are
  byte-identical (Forge's scratchpad, not in git).
- **Probe's catch:** Playwright's trace recorder injects one script per frame, which the sandbox
  refuses too. So T36 runs with `trace: "off"`, and its failure message lists every logged line.

### Decisions

`.crew/sprint/76/decisions.md`: T36 allows the JSON-LD block (1), the Pages Router (2), and the
accepted side effects (3), and the B5.7 fix (4). No Owner's pick: nothing here touches an owner path or `content/`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZDif286zN3guiApHa
