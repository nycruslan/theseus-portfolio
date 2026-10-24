## Sprint 27: B3, Full, Calm, Off

**Goal (roadmap):** the Full/Calm/Off control the owner approved on sprint 17's canvas
(`motion-control.webp`): Full plays the loft once a visit (the default), Calm opens the model
settled and draws on events only, Off is the 2D sheet with no 3D downloaded. The choice is
remembered on the device; reduced motion starts at Calm. The control exists only where scripts
run, in slots the page keeps, so nothing moves. B2.3 and the keyboard's 12th stop are rewritten
with the same assertions. Lens's nits on #73 and the cold-cache fallback face ride along.

**Size:** M. Forge built, Probe wrote the checks first, Iris placed the control and reviewed.

## What changed, for a visitor

- **The control** (`components/model.tsx`, `components/bar.tsx`, `app/globals.css`, "The motion
  control"): a `<fieldset aria-label="Motion">` of three `aria-pressed` buttons, Full, Calm, Off.
  From 768 px it sits in the bar after Read as page, as `main.webp` draws it (44 px tall to 1023,
  32 from 1024); below 768 px at the drawing's foot, a 44 px row between the drawing and the title
  block, right-aligned (Iris's call, `.crew/sprint/27/notes-iris.md`; decision 8). Two slots are in
  the server's HTML at the group's size, so the buttons' arrival moves nothing; without scripts
  the slots are empty.
- **The mode** (`components/model.tsx`): `stored ?? (saveData ? off : reduce ? calm : full)`,
  kept in `localStorage` under `theseus:motion` inside try/catch and followed live from the
  device's hints while nothing is stored; a press stores and applies at once (decision 3). With no
  WebGL 2 the control shows Off pressed with Full and Calm disabled.
- **Full, Calm, Off on the model** (`components/model.tsx`, `lib/model/mount.ts`): Full is sprints
  25 and 26's loft; a press of Full from Calm or Off rebuilds the model and lofts again from the
  drawing (decision 4). Calm opens settled, 0 frames at rest, 1 on a scheme change or a refit;
  pressed mid-loft it settles within 2 frames. Off tears the model down (`forceContextLoss`) and
  the whole drawing returns; stored, it never probes WebGL or imports the chunk. The mount takes how
  to open (`auto`, `settled`, `loft`) and exposes `settle()`; its reduced-motion listener moved
  behind the mode.
- **Bytes:** `/`'s first-load script with WebGL refused is within B2.10's 2,048 B decoded of
  `/sprints'` (decision 9): the store, the control and the loader share one module.
- **Riders:** Lens's three code nits on #73 (the cap reset in `cross()`, `overflow: clip` on the
  layer, the stray JSDoc); the cold-cache fallback face (the condensed wordmark's fallback fitted to
  its width and the bar's links `nowrap`, so the bar stays one row at 320 and 390 and nothing
  scrolls sideways); Lens's two comment nits on #67 in `app/fonts.ts` and `app/layout.tsx`.

## The contract and its results

`.crew/sprint/27/contract.md` (amendment 1 is Iris's placement); decisions in
`.crew/sprint/27/decisions.md`; Iris's call in `notes-iris.md`, her review in `review-iris.md`.

Every check is a Playwright test; the control's are `e2e/motion.spec.ts` (B3.16 to B3.23), the
rewrites in `e2e/sheet.spec.ts` and `e2e/keyboard.spec.ts`, the two masks in
`e2e/model-landing.spec.ts` (amendment 3) and `motion.spec.ts` (amendment 2). On the integrated head
`098d731` Atlas's full run is **166 of 166 passed** (10.9 min) with `pnpm verify` green; Forge's
full run on `4167284` was 164 of 166 with the two reds the two compares that amendments 2 and 3
mask. Every B3.16 to B3.22 check is red on main (no control); B3.23's mutant (the fallback face
reverted) turns it red at 320 and 390. `expect(` counts per rewritten file are unchanged (sheet 46,
keyboard 39, model-landing 14; motion 22 new).

| Check | Bound | Read |
|---|---|---|
| B3.16 the control | one shown slot per width, the group in place, Full default, 44/24 px targets, slots empty and same-sized without scripts, CLS 0 | holds at 320, 390, 768, 1024, 1440; group 191 to 374 × 300 to 344 at 390, 1258 to 1400 at 1440; axe clean |
| B3.17 Full | a press from Calm or Off lofts from frame 1 within B3.1's bound; Full while Full does nothing | frame 1 within 1.00 CSS px at 1440 and 390 (bound 1.5); a real-time replay may rest `still` under SwiftShader's load, the clock run ends `settled` at 2,400 ms ± a frame |
| B3.18 Calm | settles within 2 frames mid-loft; a new tab opens settled; 0 frames at rest, 1 on a scheme switch | holds |
| B3.19 Off | `data-state`, canvas and context gone within 2 frames; `off` stored loads no chunk and requests no context; the sheet pixel-identical to the refused page (the control masked) | Off clears the model 1 frame after the press; 0 live contexts; 0 pixels differ in both schemes at 390 and 1440 |
| B3.20 storage | each mode survives a reload and a new tab; storage throwing gives the default and a press holds for the visit | holds, no console or page error |
| B3.21 the hints | reduce → Calm pressed, settled; `full` stored under reduce lofts; reduce on mid-loft settles within 2 frames and Calm becomes pressed; Save-Data → Off and nothing downloaded; `full` stored under Save-Data lofts | holds; B3.4 and B3.5's cases unedited |
| B3.22 forced colours and the keyboard | one ring per focused button; the pressed label reads (≥ 3:1 inside its text box); Tab order; Space and Enter press | holds after `f9a1b6c` (before it: "Full (pressed): 1.00:1", the backplate Iris found) |
| B3.23 the fallback face | woff2 refused: four links on one row, each label one line, no sideways scroll at 320 and 390, the fold holds | holds; mutant red: +30 px at 320, +3 at 390 |
| B2.3 and the keyboard rewrites | four links then the group at 1440, the group `main`'s below 768; Contact's first link the 15th stop | holds |
| B2.10 script bytes | within 2,048 B decoded of `/sprints'` | 2,038 B (the loader alone was 961) |
| B1.1 the fold at 390 × 844 | the title block's items in the first viewport | holds; title block top 356, Contact links' bottom 629, Revisions head on screen |

**Iris's review** (`.crew/sprint/27/review-iris.md`): **ship at 9.0**. Better than production at
390, 1024 and 1440; the sheet pixel-identical to production at every width in both schemes with
the control and the fallback face apart (0 differing pixels in 46 captures); axe 0, no placeholder,
LCP at 4× CPU and 400 kbps 1,684 ms light / 1,756 dark, CLS 0; no musts and no cheap changes left.
Her early look found one must, the pressed label vanishing behind Chromium's forced-colours
backplate, fixed as she wrote it (`f9a1b6c`, decision 12). Her roadmap notes: forced colours with
the model refused still shows Full or Calm pressed while nothing can play (the no-WebGL state
would be truthful); the three words carry no visible noun, if the demo shows hesitation; the
"Base" label on the narrow sheet, unchanged.

**Riders taken:** Lens's three code nits on #73 and the two comment nits on #67; the cold-cache
fallback face at its cause (decision 13). **Follow-ups, not this sprint's** (`ROADMAP.md`): the
text face's fallback has the same one `local(Arial)` source (its links ran 7 px wider and fit);
B2.10 has 10 B of headroom, so new client code on `/` reopens the budget with the owner; Iris's
three notes above.

## For the owner: the control's place on phones, against `hero-390.webp`

Iris's paragraph (`notes-iris.md`, section 7):

> On phones the Full / Calm / Off control sits under the drawing, at the right, just above the
> rule that opens your name, not in the bottom strip the canvas drew. That strip held Read as page
> and the control together; since the phone bar you approved in sprint 22 took Read as page, the
> strip had nothing else in it, and the only ways to keep a control at the screen's foot were to
> pin it over the page (it would cover your bio on a small phone) or to lengthen the first screen
> to a full frame. Under the drawing it belongs to the thing it controls, costs the first screen
> 44 px (your name, role, bio and links still sit inside it with 215 px to spare at 390 × 844), and
> scrolls away with the sheet. From 768 px, and on the desktop, it is in the bar at the right end
> exactly as the frame draws it. The preview shows it at 390; say if you'd rather see the strip.

This PR doesn't wait for that: it changes no owner path and retires nothing. Say so on the PR or
at the demo if you want the strip, and the next sprint moves it.

## The B3 demo, on this PR's preview

On your phone and at 1440: 30 fps through the loft, the DPR ladder and the still frame on a real
GPU (every number so far is SwiftShader's floor), the e² loft's feel at 390, the dark hull under the
warm lamp; the control (Calm and Off, a reload that opens settled, reduced motion starting at Calm,
a press of Full replaying the loft); whether a toolbar show/hide re-solves the loft at rest (Lens's
nit on #73); and the "Base" label under the shadow's tail on the narrow sheet (Iris, sprint 26).
