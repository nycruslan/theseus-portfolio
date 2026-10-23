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

RESULTS

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
