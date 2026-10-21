# Sprint 17 direction (Iris): draw the hull, then rebuild it at sea

**Canvas (the owner approves or comments there):** https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5
Private until the owner shares it. 20 artboards in 8 rows, plus three notes at the top: the ask, the
position, and the owner's four calls.
Its artboards are public, though: the Studio shows them from `design/`, as images listed in
`design/frames.json`. The canvas's link and comments stay private.

## The position

I take the brief's direction and don't replace it. It passes every test the research sets, and I found
nothing stronger. I raise it in three places where it was still open or risky:

1. **The registered loft.** The 3D model first renders orthographic and lands exactly on its inked
   profile (on a phone, on the body plan), so the drawing becomes the thing it describes with no
   cross-fade and no pop. Then one camera move, a dolly-zoom from orthographic to a 30 degree lens
   that holds the sheet's size, lifts the model off the page: 2.4 s, exponential ease-out, once a
   visit. The page, the title block and every word never move. This answers the research's top risk
   ("if the loft feels like a CAD export, the direction collapses"): it's a camera move, not a morph,
   and it's cheap.
2. **A card model on drafting film, and no painted sea.** The hull is white card, the drawing's own
   material, lit softly, with its shadow on its own half-breadth plan (the architect's white model,
   not a varnished boat). That avoids maritime kitsch and the blueprint cliché, keeps phones cheap (no
   textures, one material), and keeps the 2D state the brand. "At sea" is the designed waterline,
   Neurath's point, never water.
3. **Four states, one material each:** ink and card = merged; graphite = the plank in progress;
   copper = live, this minute (and nothing else is copper); vellum = removed (the ghost hull). The
   original planks are a shade greyer card. A visitor can read the crew's state from the hull alone.

The page grammar is a drawing sheet: a labelled bar (Work, Crew, Log, Contact, Read as page, and the
Full/Calm/Off control), the lines plan above, and along the bottom the revision block (the live layer:
drawn, checked, tested, approved) beside the title block (the name at 104 px, role, the bio's first two
sentences, contact). The name is the largest paint, so LCP is text. Work, Read as page and contact are
plain and familiar.

Everything on the canvas is real: `content/profile.ts` verbatim; the 15 retros and GitHub's merge
times for the revisions; this sprint's own session for the live view; every model image rendered
with three.js from `lib/half-model.ts`'s geometry, mirrored into a full hull (sources in
`render/`: `shots.mjs` lists every frame and its pose; to rerun, install `three@0.186.1` there, put
the two Sofia woff2 files in a sibling `fonts/`, serve the parent folder on port 4517 and run
`node shoot.mjs shots.json <out>`). "70 of 2,027 lines original" is `git blame` on `app/`, `components/` and `lib/` at
e6551d3, counting lines dated before sprint 1 merged.

**Compared with production: better.** Today is calibration 08 (6.5): the template's column. My
estimate for the direction as drawn: design 8, originality 9, craft 8, functionality 8, **8.3/10**.
Discount it: it's my own work, before the build.

## What changed from sprint 15 ("the log of the Theseus")

- **Kept:** plank = one merged sprint, 22 planks on the existing 7 lifts and butts, and sprint 15's
  shipwright's order (the k-th merged sprint takes `ORDER[(k-1) mod 22]`; a closed sprint takes no
  plank). The facts in real HTML, tabular figures, no cards, no radii, nothing that fades.
- **Dropped:** the ledger as the page's world, Besley (Clarendon) display, the patina from copper to
  verdigris by age, the hull cropped at the stern as a hero image, the dark ship band. The owner's
  interview asked for spectacle first and a 3D signature; the ledger was a quiet page with an object.
- **New:** the lines plan and title block as the first frame, the loft, the card model, the four
  material states, the revision block as the live layer, the ghost hull at `/log`, the motion control,
  and one typeface family (Sofia Sans and Sofia Sans Extra Condensed, DIN-lineage, OFL) instead of
  Geist. Copper changes job: from links to "live now".

## Needs decision (owner), on the canvas

1. The model's material: white card (proposed), or wood.
2. Copper means "live now" only, so links become ink. That moves copper's job from links to the crew.
3. The "Approved" column says what happened: "Owner" where the owner accepted a PR (sprints 1, 2, 7,
   9, 10, 12, 15), "Gate" where `merge.mjs` merged behind CI and Lens. Or does every merge read as the
   owner's?
4. "Detail A" on Work draws the JPMorgan summary's own words as a small schematic (around 8 product
   teams, the gateway, Bedrock, Azure OpenAI, Anthropic API). Keep it, or text only?

## Budgets (for Quill's contract)

| Measure | Budget |
|---|---|
| LCP | ≤ 2.5 s on a mid phone, target 1.5 s; always text (the name at 1440, the name or bio at 390) |
| CLS / INP | 0 after load (font fallbacks fitted with `size-adjust`); INP ≤ 200 ms |
| JS to read the facts | 0 KB. No-JS, no-WebGL, print and Off all show the 2D sheet with the planks drawn |
| Fonts | two variable woff2, latin, about 81 KB together (measured: 40.5 and 40.4 KB); the display face preloaded |
| 3D chunk | ≤ 250 KB gzip, after first paint; three.js `WebGPURenderer` with its WebGL 2 fallback; GSAP for the loft only |
| Draws | ≤ 8 per frame: all planks in one instanced or batched mesh with a per-plank state attribute, seams as one line batch, deck, shadow |
| Geometry | ≤ 30k triangles desktop, ≤ 12k phones; no textures except a 64 px hatch |
| Frame time | designed for 30 fps on phones; step quality down above 22 ms, up below 12 ms; still frame if under 30 fps; DPR ≤ 1.5 phones, 2 desktop |
| Rendering | on demand after the loft; 0 frames at rest, off-screen or with the tab hidden |
| Loft | once a visit, 2.4 s, skippable by any input; Calm and reduced motion open settled; Off never loads WebGL |

Build order suggestion: B1 the sheet in 2D (bar, lines plan, title block, revision block from the
retros, Off as the default for everyone), B2 the facts and `/read`, B3 the 3D model and the loft, B4
`/crew` from the Studio's events, B5 `/log` and the ghost hull. The site is whole after B1.

## What I couldn't verify

- The renders are swiftshader frames in Playwright's Chromium, not a phone; the 30 fps budget needs
  Pixel's spike on a mid Android and an iPhone in Low Power Mode before B3's contract.
- The artboards were checked locally in a stub (their markup without the canvas runtime): axe found no
  violations on all 20, and impeccable's detector found no errors (advisories: the pencil hatch, which
  is a drawing's hatching on purpose; warnings: the full-bleed sheet images read as flush padding). I
  have not seen the canvas in the owner's browser.
- The Studio's event schema: the live view uses this sprint's real activity as the example; the
  allow-list (who, kind, folder, never prompts) is the research's, not yet the Studio's.
- `pnpm exec biome ci .crew/sprint/17` processes nothing: biome ignores sprint folders since #48.
