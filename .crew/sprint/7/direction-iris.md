# Sprint 7 direction: the 3D hero (Iris)

**Position:** a shipwright's half-model built from planks, with one copper plank. The page is the
backboard it hangs on. It's the Ship of Theseus in one object, and it uses the accent the way the
page already does: copper is the newly fitted part.

I prototyped the static form as an injected inline SVG on a local build of `main` (production is a
proxy 403 here) and looked at it at 320, 390, 1024 and 1440 in both schemes. The board is in
`direction-iris.png` (local only, since the sprint folder's PNGs are gitignored). The form in the
prototype is a stand-in: Pixel draws the real lines from a reference. The measurements below come
from what I saw.

## The element

- **Form:** a lift half-model, the kind Herreshoff carved to design hulls and that line the walls
  of maritime museums (Mystic Seaport, the Herreshoff Model Room). It is a long, low half-hull
  (length to depth about 5:1) with a sheer that springs toward the bow, a raked stem, a short
  counter, and a rockered bottom. It's built from 7 stacked lifts joined by hairline seams in
  `--background`, the same 1 px shared seam as the plank cards. Each lift shows staggered butt
  joints. Exactly **one plank** (one butt-to-butt length of the third lift, about 30% of the hull
  midships) is copper. Nothing else carries the accent.
- **Material:** matte. Lambert light comes from the upper left, and shading changes **lightness
  only**, never hue. There's no specular, environment map, bloom, fog, drop shadow, outline or
  texture. Verdigris lifts alternate two close tones, as lift models alternate woods. Every tone
  derives from the five tokens through `color-mix(in oklab, …)` or `oklch(from var(--x) …)`, with
  no new hex. (Mixing in oklch turned the light lifts pink in my prototype, so use oklab.)
- **Placement:** in normal flow directly after `<header>` in `app/page.tsx`, with main's 64 px gap
  above and below it. The name, headline, location and bio come first, untouched.
  - **≥ 768 px:** the box hangs 32 px past the column on both sides, as the plank cards do: 688 ×
    172 at 1024 and 1440. The hull's stern and bow tips sit on the text's left and right edges
    (624 px long).
  - **< 768 px:** the box is full-bleed, like the phone strakes, with an aspect ratio of 2.9:1
    (390 × 134, 320 × 110). The hull is 1.12 × the viewport long, its bow tip on the right text
    edge (viewport − 24 px), and its stern runs off the left edge. A whole hull at 342 px read as a
    clip-art boat icon. The crop makes it an object you're standing next to.
  - It sits in the first viewport at 390 × 844, 1024 × 768 and 1440 × 900, and below the fold at
    320 × 640, which is fine.

## Motion

Only scroll moves it, and only the way a real object moves as you walk past it. The page plane
(the model's flat back) stays put, and the protruding form shifts with the viewing angle: an
oblique or off-axis projection, not a rotation. Before any scroll the view is about 13° from
above (shear +0.24). By the time the box's bottom leaves the top of the viewport, it has turned to
13° from below (−0.24), linear in scroll. At scroll 0 the pose is exactly the fallback's.
- There's no idle loop, sway, spin, pointer or tilt response, and no load-in animation. Nothing
  moves while the visitor doesn't scroll, so nothing auto-plays past 5 s (WCAG 2.2.2), and a
  low-end phone does no work at rest.
- **Reduced motion** (hard gate): parallax is a vestibular trigger, so the 3D code is never
  fetched and the static fallback shows. Nothing is lost, because the fallback is the same object.
- It never covers or moves text or click targets: it has its own box in flow,
  `pointer-events: none`, `aria-hidden="true"`, no tab stop, and every pose stays inside the box.

## The degraded look (it's the default)

The server-rendered **inline SVG** of the rest pose is always in the HTML. It's one path per lift,
each with a horizontal gradient standing in for the light, plus the seam and butt hairlines and
the copper plank. It *is* the hero for no-JS, reduced motion, no WebGL or
`failIfMajorPerformanceCaveat`, Save-Data, `deviceMemory < 4` or `hardwareConcurrency < 4`, a lost
context and print. WebGL is an upgrade on top of it: it loads after the page is idle and only when
the box nears the viewport. It replaces the SVG at an identical pose (an opacity crossfade of at
most 200 ms is allowed, and nothing moves). If 3 frames in a row exceed 50 ms, it freezes where it
is. In both schemes the SVG follows the tokens through CSS variables; the canvas reads its tones
from the SVG's resolved colors, so the two can't drift, and it re-reads them on a scheme change.
Under `forced-colors: active` the whole box is hidden.

## Rejected

1. **A bronze blob, torus or knot with PBR and an environment map:** the default "3D hero",
   glossy and glowing for no reason, and it says nothing about this person or this site.
2. **A particle globe or network of "agents":** the AI category default, glow by design, and the
   heaviest option on a low-end phone.
3. **A full ship (masts, sails) on a turntable:** kitsch, busy at 342 px, and an auto-spin is
   decoration that breaks 2.2.2.
4. **A full-bleed canvas behind the name, or the hull above the name:** text over a moving scene
   fails contrast and competes with the name. Above the name it reads as a logo banner and pushes
   the name 200 px down on a phone. I tried both. (I also tried a hull running in from the left
   edge at 1440. It's bold, but it outweighs the name and isn't subtle.)

Also out: a plank that animates its own replacement, and any sprint-count encoding of which plank
is copper (that would be a claim the owner hasn't made).

## Lines a contract can check

1. **Footprint:** the box is 688 × 172 (±1) at 1024 and 1440 and viewport × viewport / 2.9 below
   768 px. It's never taller than 180 px. At 320, `scrollWidth === clientWidth`.
2. **Alignment:** at ≥ 768 the hull's tips are within 2 px of the text's edges. Below 768 the bow
   tip is within 2 px of the right text edge.
3. **No layout shift:** the box is sized in CSS from the first paint. CLS is 0 at 390, 1024 and
   1440, and the swap to canvas changes no box.
4. **LCP:** the LCP element is text and never the hull. On `main` it's the bio `<p>` at 390 and
   1024 and the first Experience summary at 1440 (not the h1), so with the hull added it should be
   a header paragraph. LCP is no worse than `main` + 100 ms at 4× CPU. The fallback has no
   `<img>`, `<image>` or background image.
5. **Weight:** the inline SVG is ≤ 8 KB. The 3D code, libraries included, is ≤ 15 KB gzip in a
   dynamic chunk, and first-load JS grows ≤ 2 KB gzip. (three.js doesn't fit; that's Pixel's
   call within the budget.)
6. **Quiet:** every non-copper tone is between 1.15:1 and 3:1 against `--background` in both
   schemes, which keeps it below `--muted`. In my prototype it was 1.2–2.3 light and 1.3–2.8 dark.
   The copper keeps `--accent`'s hue (±3°) and chroma, with lightness within ±0.06 of the token.
   No text sits on it.
7. **Motion:** with no scrolling for 2 s, the hull draws 0 frames. The z = 0 outline stays within
   1 px of its page position at any scroll. Under reduced motion, no 3D chunk is requested and the
   box's pixels are unchanged by scrolling.
8. **Degrade:** with WebGL disabled, the SVG is present and no canvas exists. The canvas's first
   frame matches the SVG's silhouette within 1 px.
9. **Hard gates:** axe finds 0 serious or critical issues, the detector reports nothing at error
   level, and nothing over the hull's box is clickable or focusable.

Owner's taste call: this is new visual language. If the owner wants it bolder, the next step is
the left-edge variant, not glow or spin.
