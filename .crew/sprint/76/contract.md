# Sprint 76 (S): the trials page logs nothing

Goal (from the roadmap's stand-down, chosen by Atlas): a peer who opens the console on `/trials`
sees no errors. Today every trials view logs 48 in Chromium on production (measured 2026-11-18 at
1440 × 900 on `/trials` and `/trials/320x568`; `/`, `/log`, `/crew`, `/ask` and `/evals` log 0):
"Blocked script execution in '…/trials/frame' because the document's frame is sandboxed and the
'allow-scripts' permission is not set." The frame's document carries `/`'s script tags, which the
sandbox refuses one by one. Open since sprint 67's demo (`.crew/sprint/67/demo.md`, Left open,
"Pixel (with Forge): the frame's console").

The fix the demo named: serve the frame's document (`/trials/frame`) without script tags, so
nothing is refused. Blocking them by CSP is ruled out, since T9 requires no CSP refusal.

## Check

- **T36** On `/trials` and `/trials/320x568`, at 390 × 844 and 1440 × 900, from load to rest + 2 s:
  no console error or warning and no page error, in the page or its frame; the frame's document
  (`/trials/frame`, fetched) has no `<script>` element; and the frame still draws `/` as before
  (its name block and the contact links are in it, and the readout's freeboard is unchanged).
  It fails on main (48 errors).

## Budgets

The kept trials checks (T1 to T35) stay green unedited, above all T8 (bytes, LCP, CLS), T9 (the
header, no CSP refusal) and the sweep's staleness check: the frame must lay `/` out exactly as now,
so the committed sweep still matches. Nothing on any other page moves.

## Out of scope

`/` itself and every other page; the cold-load caption jump (T8's CLS on production); the frame's
other follow-ups (card silhouette, words); owner paths and `content/`.
