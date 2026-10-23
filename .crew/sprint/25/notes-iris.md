# Sprint 25 notes (Iris): the loft's calls

Decided on the spike's prototype at http://localhost:4534/ (Atlas's build of `.crew/sprint/24/spike/proto/`,
`three` restored as a real copy where the symlink dangled), through the repository's Playwright, since
chrome-devtools can't start Chrome as root here. Every frame is SwiftShader at 1440 × 900 and
1024 × 768, DPR 1 unless said; motion was judged from frame sequences at true frame times (two mp4s
assembled with ffmpeg) and from the loft's own maths, not from a real-time playback. Evidence is in
my scratchpad, `…/scratchpad/out/` (paths in the report). Each call is one constant unless marked
**contract**; those go to Atlas, not into the build as a different rule.

## 1. Duration: 2.4 s stands

`DURATION = 2400`.

The owner approved 2.4 s on the canvas, and the number isn't what's wrong. What S5 read as "0.8 s of
motion then an 805 ms creep" is the curve's front-loading (2^(−10u): 82% done at 600 ms), which call 2
fixes without touching the duration. With call 2's ease the move is 90% done at 1,105 ms and 99% at
1,995 ms, visible motion (≥ 0.5 px a frame at 60 fps) lasts 1.33 s instead of 1.07 s, and the creep is
405 ms. The shorter durations with the old curve don't help: 1.8 s reads as 0.6 s of motion and a 600 ms
creep, 1.5 s as 0.5 s and 500 ms, and 1.5 s starts at 6.5 px a frame (`numbers.json`).

## 2. The ease: a softer exponent with a 120 ms ease-in

```
EASE_K  = 7       // was 10
EASE_IN = 0.05    // share of the duration: 120 ms at 2.4 s
ease(u) = (1 − 2^(−EASE_K·u)) / (1 − 2^(−EASE_K)) × smoothstep(0, EASE_IN, u)
smoothstep(0, a, u) = t·t·(3 − 2t), t = min(1, u / a)
```

The product is C1-continuous (the smoothstep's slope is 0 at `a`, so the velocity hands over to the
exponential's without a kink) and reaches exactly 1 at u = 1. No `landed` hold: the move may begin on
the frame after the canvas shows, because the drawing has been still since first paint and the
ease-in supplies the rest the eye needs.

Measured on the loft's maths at 1440 (`numbers.json`, skeleton travel 149 px):

| | 2^(−10u), no ease-in (contract) | this call |
|---|---|---|
| First frames at 60 fps, px | 4.1, 4.0, 3.9, 3.8, 3.7 … | 0.2, 0.9, 2.1, 3.3, 4.2, 4.5, 3.8 |
| First frames at 30 fps, px | 8.1, 7.6, 7.6, 8.1 | 1.1, 5.4, 8.8, 6.6 |
| Peak px per 60 fps frame | 4.2 (at frame 1) | 4.5 (at frame 6, 100 ms) |
| 50% / 90% / 99% of the move | 240 / 797 / 1,595 ms | 339 / 1,105 / 1,995 ms |
| Visible motion | 1.07 s | 1.33 s |
| Travel in the last 500 ms | 0.9 px | 2.9 px (a settle, not a stop) |

The start strips (`start-expo10.webp`, `start-expo7n_in05.webp`) show the difference: at full speed the
sheer line is already doubled at 17 ms; with the ease-in the first two frames are the registered
drawing to the eye and the lift is read from 67 ms. The storyboard's beats hold: at 0.43 s the move is
58% done (was 71%) and at 1.0 s 87%, the canvas's "nearly settled" (was 94%).

**Contract:** the contract names 2^(−10u); this changes that number, so it goes in
`.crew/sprint/25/decisions.md` and the owner sees it on the preview.

## 3. Hold the height, never the width; and a 10% grow for Atlas to rule on

`HOLD = "height"` (the contract's). Not the width: holding the framed width at 1440 settles a hull
810 × 195 px (`1440-settled-hold-width-full.png`) whose deck runs into the "Profile" caption, whose bow
overshoots station 10, and under which the drawing is lost; the direction's story is "its own drawing
stays behind it".

But the height hold alone leaves the settled hull at 79% of the drawing's length (640 × 153 px,
`1440-settled-hold-height-full.png`), its bow a station short of the drawing's, and it reads shrunk.
The approved `main.webp` holds neither: its settled hull is 0.86 of the drawing's length and 1.11 of
its height (measured on the canvas). Rendered here at 0.08, 0.12 and 0.16 (`1440-grow-*-u1-box.png`),
0.10 is the match.

**Contract (Atlas):** `GROW = 0.10`, the framed height follows `(1 + GROW × e) × frame 1's`, so
u = 0 stays registered and the settled hull is 0.87 of the drawing's length and 1.10 of its height.
That changes the data rule "its scale is solved so its framed height holds within 2%" and B3.2's
assertion to "within 2% of (1 + GROW × e) × frame 1's" (Probe's harness already knows e from the clock
and the ease). Until Atlas rules, `GROW = 0` is the contract as written. Quill's visitor's view (a
shrinking hull reads as moving away) is answered by the grow, not by the width hold.

## 4. The shadow: the scene's one texture, 0.18 in light and 0.6 in dark

Confirmed: the baked, blurred coverage plane is the scene's only texture (generated, not downloaded,
no shadow map, no extra pass); the hatch stays procedural. The direction's "no textures except a 64 px
hatch" meant downloads and memory, and this is neither.

```
SHADOW_LIGHT = 0.18   // --foreground ink over the sheet
SHADOW_DARK  = 0.6    // black (#000) over the sheet
```

Light: on `main.webp` the shadow's lobe over the half-breadth plan averages luminance 207 on a 239
ground (−32); the renders give −29 at 0.16 and −38 at 0.22 (`1440-shadow-light-*.png`), so 0.18 is
the canvas's. 0.3 is a smudge. Dark: on `#10191c` black at 0.3 is invisible, 0.5 faint, 0.6 reads as
the construction lines dimming under the hull (`1440-darklit-4-box.png` has it), 0.7 a smear. Texel
and blur as the spike.

## 5. Under the lifted model the drawing goes hollow; the seams stay 0.9 px on both sides

**The drawing.** Option (c): from the first `lofting` frame, and in `settled` and `still`, the
profile is drawn unfilled behind the model, as `loft.webp` frames 2 to 5 draw it:

```
[data-plan]:has(+ [data-model]:is([data-state="lofting"], [data-state="settled"], [data-state="still"])) {
  & path[data-plank] { fill: none; }
  & .plan-plank, & .ln-leader { visibility: hidden; }
}
```

in the "The model" section of `app/globals.css`: the drawing's markup and its own rules don't change,
the Off page, print and `/read` have no `[data-model]` and never match, so B1.4, C6 and B2.5 hold.
While `landed`, build note 6 stands: numbers above the canvas, fills as they are, so the hand-off
changes nothing.

Why (c), from the prototype at u = 0.25 and 1 (`1440-under-*.png`): with the fills and numbers kept
(a) the sheet shows two hulls, a flat numbered one and a lifted one, and "3" and "10" sit on the
lifted deck's edge as labels of the wrong planks; with the fills gone and the numbers kept (b) the
numbers sit in empty boxes, half under the hull. Hollow, the drawing reads as the drawing the model
came from, its stations showing through as on any unfilled lines plan. The leader goes with its
number ("20" sits outside the hull on a leader) so no leader points at nothing.

The cost: the 22 labels vanish at the first moving frame. With call 2 the model has moved 0.2 px by
then, so they vanish under its face rather than from the paper; a fade would be a CSS transition that
B1.8 counts, so it's a cut, and I accept it. Pixel's option (b) alone (numbers under the canvas once
lofting) is the same cut for every number inside the hull and leaves the drawing filled, which is the
two-hull picture.

**The seams.** `SEAM_PX = 0.9` on the model, `OUTLINE_PX = 1.6`, the SVG untouched (decision 6's
default stands, but with no heavier weight either). Measured at DPR 2 on the registered frame
(`seams-dpr2.webp`, `seams.mjs`): each SVG seam carries 384 units of ink over 2 to 3 device rows with a
peak darkness of 221; the model's carries 386 over 4 rows with a peak of 178 to 197. The ink is the
same within 1%: the double-inked rectangles aren't what S4 saw, the fat line's edge is softer. A
heavier model seam would raise its peak by lowering the outline's 1.6 : 0.9 hierarchy on the settled
hull for a hand-off difference of two device rows. If Pixel wants the hand-off tighter, sharpen the
fat line's edge (`alphaToCoverage` with MSAA, or a tighter edge in `LineMaterial`'s fragment), not its
width. The hand-off diff count against S4's 4,891 is then mostly those soft rows, and I'll read it with
Probe.

## 6. The dark scheme: the tokens, and the rig at gain 4

```
seated card      --card        #58646a
original card    --card-old    #222d31
seams, outline   --foreground  #e2eae9
hemisphere ground --background #10191c   (sky stays white)
DARK_GAIN = 4    // every light's intensity × 4 in dark: hemisphere 6.4, fill 3.6, sun 5.6
shadow           black at 0.6 (call 4)
```

The spike's rig (hemisphere 1.6, fill 0.9, sun 1.4) is kept for light: it matches `main.webp` better
than a top-weighted key, which clipped the upper strake to 255 (`1440-key-*-light-box.png`). In dark
at gain 1 the lit card comes out 92 / 78 / 79 (upper, mid, lower strake, sRGB luminance) against its
own token's 99: darker than the flat drawing, so the model lifts into shadow. Gain 4 gives
175 / 151 / 130 and 164 at the bow against `night-1440.webp`'s 191 / 164 / 122 / 163
(`1440-darklit-4-box.png`, `keyvals.mjs`); gain 3 is 153 / 132 / 117 and gain 5 193 / 167 / 141. The
hand-off is untouched: the flat-to-lit mix is 0 at u = 0, so the registered frame is the token in
either scheme (`1440-dark-u0-box.png`). Pencil `--pencil` and copper `--accent` (#ee8f63) are B4's.
A scheme change redraws from the computed tokens, as the contract says.

## 7. 1024: the 1440 pose, scaled by the drawing

No change: the settled pose is the same screen-space pose scaled by the drawing's width
(k = 990 / 1408), lift and settle offsets with it, the lens 30° over the viewport's height (768 →
D = 1,433 px). Measured (`1024-settled-full.png`): the hull 450 × 108 px, its bow at station 9, the
shadow inside the half-breadth plan, the body plan clear of both. With call 3's grow the same frame
grows 10%. One consequence to accept: the lens follows the viewport height, so a 1024 × 1366 portrait
tablet gets a weaker perspective (D = 2,549), which is a gentler loft, not a wrong one.

## 8. Reduced motion: a 240 ms opacity fade, not a cut

```
REDUCED_APPEARANCE = "fade"
REDUCED_FADE_MS    = 240   // linear
```

Under `(prefers-reduced-motion: reduce)` only: when `[data-model]` reaches `settled` the canvas's
opacity goes 0 → 1 over 240 ms and the plank numbers 1 → 0 over the same 240 ms (one rule each under
the media query); the fills cut, since card to film is a 6-level change nobody sees. Opacity isn't
motion (WCAG 2.3.3; research A7), and a 640 px object cutting in one to two seconds after the page
has painted reads as a glitch where a fade reads as intended. B1.8 emulates `no-preference`, so it
counts neither rule; B3.6's reduced-motion run should see exactly one `transitionrun`, on the canvas,
and none in Full.

## 9. The frame after batch E: a minimum height for the bottom row that fills the fold

Keep Forge's 14 px floor under the bio as the safety for the row's natural height. Add, on both cells
of the bottom row (the revision block and the title block) from `lg`:

```
min-height: min(21rem, calc(100svh - 88px - (100vw - 34px) * 0.3381));
```

88 px = the bar (72) + a 16 px margin below the frame, the same as the side gutters; 34 px = the two
16 px gutters and the frame's 2 px of borders; 0.3381 = 476 / 1408, the wide drawing's height over
its width (`lib/hull-layouts.ts` `WIDE.box`). 21rem (336 px) caps it: on a tall window the sheet keeps
the canvas's proportion instead of stretching.

Measured on Forge's servers (`frame.mjs`, :3371 before, :3372 after):

| Viewport | Row before | Row after | With the minimum | Frame's bottom edge |
|---|---|---|---|---|
| 1440 × 900 | 346 px (ends 893) | 308 (ends 856; the facts' rule at 896 shows) | 336 | 883, as `main.webp` |
| 1024 × 768 | 525 (ends 931) | 339 (ends 746) | 339, unchanged | 746 |
| 1280 × 800 | 378 (ends 872) | 301 (ends 794) | 301, unchanged | 794 |
| 1920 × 1080 | | | 336 | 1,064 |

The title block keeps the Contact row pinned to the cell's bottom, so the extra height falls between
the bio and the Contact rule (the canvas's 50 px), and the revisions' footer ("22 planks …") stays on
the Contact row's line as it is now.

## Where I'd change the contract rather than a constant

- Call 3's `GROW = 0.10`: the framed-height data rule and B3.2's bound become
  "(1 + GROW × e) × frame 1's within 2%". Atlas's call; `GROW = 0` is the contract as written.
- Call 2's exponent, 10 → 7: a number the contract names, so `decisions.md` records it.
- Call 5's hollow drawing is a CSS rule in "The model" keyed on `[data-model]`'s state, so the
  drawing's own markup and rules don't change and the Off page is main's; B3.2's "matches
  `s5-loft-1440.webp`'s last frame" compares canvas-only frames, where the DOM fills don't appear.

## What I couldn't verify

- Feel in real time: every frame is SwiftShader, and the two mp4s (`loft-expo10-2400.mp4`,
  `loft-expo7n_in05-2400.mp4`) are frames at their true times, not a GPU's playback. The owner's
  laptop decides.
- Pixel's build at http://localhost:4617/: its 3D chunk `/_next/static/chunks/1jjuibclsna4_.js`
  answered 500 twice, so `[data-model]` mounts with no canvas and no `data-state`; call 5 was decided
  on the prototype's frames instead, as the brief first asked.
- The dark gain on a real display, and the hand-off diff count after calls 5 and 6.
- The prototype shows the text in a fallback face (its font files aren't served); nothing here
  depends on the type.
