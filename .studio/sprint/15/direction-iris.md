# Sprint 15 direction (Iris): the log of the Theseus

**Recommendation:** the site becomes the ship's log of the Theseus. The page is a ruled printed form:
a ledger of entries, with the owner's career set in its columns. The form's subject is the hull, which
is this site itself. Each sprint replaces one plank, and every plank shows its age in its metal:
bright copper for the newest, bronze as it ages, verdigris for the planks no sprint has touched yet.
The palette's story since sprint 1 ("new copper on old bronze") becomes literal and is driven by data.

**Owner decides** by merging. Everything below is a proposal until then. Prototype:
`.studio/sprint/15/prototype/index.html` (open the file directly; it needs no server).

## 1. The concept and what I rejected

### The idea in one line

A ship's log, where the record is the reading and the ship is the object: the hiring manager reads the
entries, and the engineer walks the hull, one plank per sprint.

### Why this one wins for both audiences

- **The executive in five seconds:** the first viewport is the name, the post, the city and the
  owner's bio, all real HTML and set large. The hull sits below them as the image, never in front.
  The Experience entries scan the way a ledger does: when, then where (each company set in the display
  face), then what.
- **The engineer who stays:** the hull is not decoration. It is a readout of the build log: 14 of its
  22 planks are replaced, one per merged sprint, each toned by how long ago it was fitted. Pointing at
  a sprint lights its plank. It is the brief's first candidate (plank = sprint, copper = latest)
  carried by a form that also serves the facts.
- **One idea, carried all the way** (Lando, Messenger): the name, the 3D, the build log, the palette
  and the type (the printed log form of about 1900) all come from the one ship and its log.
- **Quiet where people read** ('kin): ruled columns and no motion in reading text. **One object with
  weight** (Oryzo): the hull, cropped at the stern, on screens of every size.

### How I chose it

I used impeccable's new-work method. Its concept roll needs a product record, so I wrote one in the
scratchpad from `design/brief.md` and `content/profile.ts`, with every line labelled as inferred: a
subagent can't run the owner interview, and the repo root isn't mine to write. The roll ran
**degraded**: no network to impeccable.style, so no challengers and no quality-bar boards. I ordered
seven grounded candidates by resonance before reading the result:

| # | Candidate | Verdict |
|---|---|---|
| 1 | The brief's ship of Theseus, literally: a hull that assembles from nothing as you scroll | **Folded in.** The hull and plank = sprint stay. "Assembles as you scroll" is out: the hero would start empty, and Theseus is about replacement, not construction. |
| 2 | A naval architect's lines plan and offsets table | **Donated** its stations: the hull's ruler (0 to 10) under the hero. |
| 3 | An exploded assembly drawing with a bill of materials | Rejected: an illustration of leader lines and labels that doesn't survive 390 px, and it reads as a manual, not a person. |
| 4 | A museum conservator's condition report on one object in a case | **Donated** its legend (latest / replaced / original). Rejected as the world: a vitrine puts glass between the visitor and the work, and Oryzo already owns "one object, revered". |
| 5 | **The ship's log** (ruled form, entries, the ship as its subject) | **Assigned by the re-roll; recommended.** |
| 6 | The brief's second candidate, the platform as a living system, drawn as a transit diagram | **Rolled first, then re-rolled on factual grounds.** A network of nodes is the AI category's own default page, which the method keeps out of the candidates. The owner's numbers are four facts, not a network. It also drops the site's name, the hull and the build log. I rejected the agent globe in sprint 7 on the same grounds. |
| 7 | An air-traffic flight-strip board, with agents as strips | Rejected: a costume of a tool, and it needs a legend before it reads. |

The standing alternative, the category standard (dark, one narrow column), is today's page
(calibration 08, 6.5). I'm not recommending it.

## 2. The world: type, palette, layout

### Type

| Role | Face | Licence | Bytes (woff2, latin) | Used for |
|---|---|---|---|---|
| Display | **Besley** 700 to 900 (variable), a Clarendon revival of 1845 by Owen Earl | SIL OFL 1.1 | 36,592 | h1 (800), h2 (800), company names, headline cell, contact links, plank numbers |
| Text | **Libre Franklin** 400 to 700 (variable), Franklin Gothic, ATF 1902 | SIL OFL 1.1 | 29,292 | everything people read: bio, entries, nav, rows |

- Total **65.9 KB**, two files, no italics. Both are self-hosted (the licence texts are in
  `prototype/fonts/`). They replace Geist, which the detector flags as an overused font.
- Why these two: Clarendon over Franklin Gothic is the American printed form of the years when ships'
  logs and ledgers were printed. It has a warm, sturdy slab with no high-contrast italic serif. That
  avoids both AI-portfolio looks: the editorial serif with tracked mono labels, and the dark grotesque
  with neon.
- **Risk to name:** heavy Clarendon in capitals reads as a "wanted" poster. Keep it in mixed case,
  always, with tracking of -0.02em and nothing tighter.
- Scale: today's five steps are kept for text. The new display steps are:
  - name: `clamp(3.5rem, 2.33rem + 6.86vw, 8.5rem)`, which is 136 px at 1440 and 64 px at 390;
  - h2: `clamp(2.25rem, 1.7rem + 2.3vw, 3.75rem)`.

  This passes the craft floor's 6rem limit for display type on purpose, on the brief's references
  (Oryzo and 'kin set their names at about 170 to 200 px).
- Figures are tabular everywhere (`font-variant-numeric: tabular-nums`), because a log's columns are
  numbers.
- Kinetic type only on h2 (section 4). Never on the h1 (it's the LCP at 1440), and never on reading
  text.

### Palette

The five tokens are **kept** in both schemes; there's no reason to move them, because the idea came
from them. New, derived:

| Token | Light | Dark | Role |
|---|---|---|---|
| `--rule-strong` | `color-mix(in oklab, muted 38%, bg)` | `muted 34%` | the ledger's ruling (decorative, never text) |
| `--bronze` | `#7a6250` | `#a07d5c` | the patina's middle: a replaced plank's tone is `color-mix(bronze M%, original)` with M = 100 − 70 × age |
| stage tokens | ground `#0f2220` (today's ink), text `#e1eae9`, muted `#96a9a6`, copper `#eb8a64`, rule `#2d4543` | ground `#0f1e1c` | the night scheme used as a region: the ship scene is the one dark band in light mode |

- **Copper's role** is "the newest part": links, and the latest plank. On a dark ground, filled copper
  is mixed 92% with the ground (my sprint 8 rule), so it reads as reflected light, not emitted.
- **Contrast**, as measured by axe in the prototype: no violations at 1440, 390 and 320 in either
  scheme. Muted text is 6.1:1 on the light ground and about 6.6:1 on the stage.
- **The patina formula**, which Quill can check:
  - The original planks are `color-mix(in oklab, muted 46%, ground)` in light and `30%` in dark.
  - The latest plank is copper.
  - Sprint n of latest L takes age `(L − n)/(L − 1)`.

### Layout: a ruled form, not cards

- **Grid:** 12 columns from 1024 px, 6 from 640 px, 1 below that. Margins are
  `clamp(20px, 3.4vw, 48px)` and gutters `clamp(16px, 1.7vw, 24px)`. Everything else hangs from them.
- **Section heads:** a printed form's **thick-and-thin rule** (3 px, a 1 px gap, then 1 px in ink),
  full width, over every section head and over the hero's title band. It is the site's signature mark.
- **Log rows** (Experience, ruslanshulga.com, Education): *when* (cols 1–2, muted, small) |
  *where* (cols 3–5, Besley 700) | *what* (cols 6–11: h3 and summary at most 40em). The columns are
  1 px `--rule-strong` rules, with a rule between entries. On phones the cells stack in the same order.
- **No cards, no radii, no shadows** anywhere. Today's project card gives way to a log row; the plank
  idea moves into the hull itself.
- **The hull:** full-bleed and **cropped at the stern** on every width. The bow sits on the right
  margin, and the length is `min(118vw, 1460px)` on desktop and 135vw below 1024 px: you stand beside
  it rather than look at an icon. On desktop, the station ruler (0 to 10) runs under it.

## 3. Key screens (prototype)

The prototype is static HTML and CSS: no script, local fonts, nothing loaded over the network at
runtime. Every fact is `content/profile.ts` verbatim. The sprint rows are the 14 retros, transformed as
`lib/sprint-log.ts` presents them.

**The 3D is a still stand-in.** Both hulls are inline SVG generated from the real
`lib/half-model.ts` geometry (in a scratchpad copy; nothing in `lib/` was edited), split into its 22
planks along the existing butts and toned by the patina formula. The WebGL build has to match these
at rest, as sprint 10's did. The only interaction is CSS: hovering or focusing a sprint row lights its
plank, through `:has()`.

Screenshots are in `.studio/screenshots/sprint-15/` (git-ignored), taken in Playwright's Chromium at
1x:

| File | What it shows |
|---|---|
| `proto-1440-light-fold.png`, `proto-1440-dark-fold.png` | The hero at 1440 × 900: the name at 136 px, the ruled title band (headline · city · Build log), the bio in cols 7–12, and the hull full-bleed, cropped at the stern and running off the bottom edge, with plank 14 copper. |
| `proto-390-light-fold.png`, `proto-390-dark-fold.png` | The hero at 390 × 844: the name on two lines, the band stacked, then the hull (moved above the bio on phones so the object is in the first viewport), the stations, and the bio starting above the fold. |
| `proto-1440-*-experience.png`, `proto-390-*-experience.png` | The ledger: thick-and-thin rule, when / where / what, company in Besley, and the five quantities in the JPMorgan summary in bold (needs the owner's approval, section 8). |
| `proto-1440-*-ship-hover6.png` | The ship scene at 1440, scrolled into the sprint list, with row 6 hovered: plank 6 lit in chalk, plank 14 in copper, every replaced plank numbered, and the legend. |
| `proto-390-*-ship-hover6.png` | The same on a phone: the stage stuck at the top, the list scrolling under it. On the phone the plank numbers are too small in this still; the 3D build has to fix that (S3). |
| `proto-1440-*-full.png`, `proto-390-*-full.png` | The whole page, both schemes. |
| `proto-320-light-full.png`, `proto-320-dark-full.png` | Reflow at 320: no horizontal scroll (scrollWidth = clientWidth in both schemes). |
| `prod-1440-*.png`, `prod-390-*.png` | Production's first viewport, both schemes, for the side-by-side. |

**Production:** https://theseus-portfolio.vercel.app answered (HTTP 200) from this session, so I
screenshotted it directly. I didn't need a local stand-in this time.

**Compared with production: better.** Production is one centred 672 px column with a 138 px hull: the
template's skeleton (calibration 07 and 08). The prototype has a world, a scale and a hull that means
something.

My estimate for the prototype is design 8, originality 8, craft 7 and functionality 8, which is
**7.8/10** against production's 6.5. Discount it: it's my own work, scored before the owner's
calibration lands. Craft stays at 7 until the motion and the phone stage exist.

**Gates on the prototype:**
- axe (wcag2a/aa, 21aa, 22aa): 0 violations in all six width × scheme runs.
- The detector: no errors. It gives seven `cramped-padding` warnings, all text sitting on a ruled
  line, which is the ledger form doing its job. The build should keep them as warnings, not "fix" them
  with padding.
- Reflow at 320: passes.
- The tab order starts: Skip link, nav (4), Build log, Theseus, then the sprint rows.
- LCP element (local): the **h1 at 1440** and the **bio at 390**. Both are text, which keeps sprint 7's
  "LCP stays text" true. The display face is now on the LCP path for desktop.

## 4. Motion storyboard

**One authored moment:** the ship scene (S3). Everything else is a single small cue or nothing. Reading
text never moves, and nothing clickable moves (sprint 5's rule).

| Scene | Scroll | Camera / object | Type | Reduced motion | No WebGL (or no JS) |
|---|---|---|---|---|---|
| **S0 Load** | 0 | The HTML paints the name, band, bio and the SVG hull (patina from the retros at build time). On idle after load, a capable device swaps in the canvas at the same pose (within 1 px, as today). Then, **once**, the latest plank seats: it slides 8 px aft into its slot over 700 ms, exponential ease-out. No loader, no gate, nothing before content. | None; the h1 is static. | No seating; the plank is already home. | The SVG at rest, identical. |
| **S1 Hero leaves** | 0 → 1 viewport | The hull yaws from broadside (today's 13° oblique, shear 0.24) toward a three-quarter bow view (+14° yaw) and rises about 6% as the hero scrolls away. The canvas lives in the hero's own box and scrolls with the page. | None. | Rest pose, no turn. | Rest pose. |
| **S2 Experience** | reading | Nothing; no canvas on screen. | Each h2 *sets*: its thick-and-thin rule draws left to right (scaleX 0 → 1) and the heading rises 16 px, both over the first 64 px of the section's entry (sprint 5's range, scroll-driven CSS). | Rule and heading at rest. | Same as the motion column (CSS only). |
| **S3 The ship** (Projects) | about 1.6 viewports of list | **Stage:** sticky, cols 1–7 at 100vh on desktop, the top 42svh on phones. **Frame A** (entry): the whole hull, broadside. **Frame B** (per row): the *active row* is the one crossing 45% of viewport height. The camera dollies along the hull and drops to 8° elevation to frame its plank at about 40% of the stage's width (desktop, scale 1.6×) or 60% (phones, scale 2.2×, so its number shows at 11 px or more). The plank stands out 3% of the beam along its normal, takes the chalk tone, and shows its number. **Frame C** (after the last row): pull back to broadside, sprint 14's plank in copper. | Rows are plain text in a list; the active row's number turns copper. | No camera move: broadside, every replaced plank numbered, and the highlight follows hover and focus only (a state change, not motion). | The prototype's SVG stage: `:has()` lights the plank on hover and focus, and the numbers always show. |
| **S3 hover/focus** | any | On desktop, hovering or focusing a row eases the camera to that plank in 300 ms and overrides scroll until the pointer or focus leaves. | | Highlight only. | Highlight only. |
| **S4 Stack, Education** | reading | Nothing. | The h2 sets (as in S2). | At rest. | At rest. |
| **S5 Contact** | end | Nothing. The page ends on the three copper links, set large. | The h2 sets. | At rest. | At rest. |
| **To /sprints** | navigation | A view transition: the copper plank's number (or the home line's "Build log") morphs into sprint 14's number on `/sprints` (`view-transition-name: latest-plank`), 350 ms. | | No transition. | A plain navigation. |

There's no scroll-jacking: sticky positioning with native scroll, with the list itself as the visible
progress. There's no sound. Nothing fades: sprint 5 showed that a scroll-linked fade fails contrast in
bands of window heights.

**The shipwright's order.** It's fixed and lives in `lib/`. Sprint n replaces `ORDER[(n − 1) mod 22]`,
written as `lift.plank`, with lift 0 at the deck:

`5.1 3.2 1.1 6.0 4.2 0.1 2.0 3.0 5.2 1.3 4.0 0.2 6.1 2.1 1.0 4.1 0.0 3.1 5.0 1.2 2.2 3.3`

The order is scattered, as real repairs are. Sprint 14 lands on today's copper spot, the third lift
amidships, so the hero's composition doesn't change at the switch. From sprint 23 the cycle replaces
its own oldest replacements, and that is the paradox, shown.

## 5. Budgets

| Measure | Budget | Notes |
|---|---|---|
| LCP | **≤ 2.5 s** on a mid phone (Lighthouse mobile: 4× CPU, slow 4G); target ≤ 1.8 s | Always text: the h1 from 1024 px, the bio below. Never the canvas or the SVG. |
| CLS | **0.00** after load; at most 0.01 including the font swap | Fallbacks with metrics fitted to Besley and Libre Franklin (`size-adjust`, as `next/font` writes them). Production's 0.015 Geist swap (sprint 14) must go down, not up. |
| INP | **≤ 200 ms**; target ≤ 100 ms on a row hover or focus | The highlight is CSS; the canvas updates in the next frame. |
| Fonts | **≤ 70 KB** woff2, two files (65.9 KB measured), latin subset | Both preloaded: Besley is the desktop LCP's face, Libre Franklin the phone's. |
| First-load JS for `/` | today's **+ 2 KB gzip** at most | Only the idle-load gate. Measure today's value in B1 and write it into the contract. |
| 3D chunk (hero) | **≤ 12 KB gzip** | Extend the hand-written WebGL renderer (3.6 KB today) with per-plank tones. Idle-loaded after LCP. |
| 3D chunk (ship scene) | **≤ 24 KB gzip** hand-written | Loaded when Projects comes within one viewport. If Pixel's spike proves three.js necessary, use `WebGLRenderer` (not WebGPU), and the ceiling becomes **180 KB gzip** for the ship scene only, never the hero. |
| Draw calls | hero **≤ 4**, ship scene **≤ 6** | All 22 planks in one buffer with a per-plank attribute (tone, lift-out, highlight): one draw. Deck, seams, labels. |
| Geometry | **≤ 30k** triangles on desktop, **≤ 12k** on phones | Phones halve the stations along each lift. |
| Mid-range phone scene | DPR capped at **1.5** (2 on desktop); no MSAA (the shader dither instead); draws only when the pose changes; **0 frames** while the stage is off screen; freezes to the SVG after 3 frames over 32 ms (today's rule); no textures; GPU memory ≤ 8 MB | The same object, lighter, not cut down. |
| Inline SVG | **≤ 3 KB gzip** per hull | Measured in the prototype: hero 2.4 KB, stage 2.6 KB. |

## 6. The build, in order (each step leaves the site shippable)

| # | Sprint | Size | Builds | Ships as |
|---|---|---|---|---|
| **B1** | **The hero** | M | Fonts (site-wide) and the derived tokens. The title block: the h1 at the new scale, the ruled band, the bio in cols 7–12. The hull at the new size, cropped at the stern, with **22 planks toned from `readSprintLog()`** at build time and the ORDER table in `lib/`. The WebGL renderer takes per-plank tones and the S0 and S1 motion. The nav. | The new hero over today's column. That's coherent, because the new faces already run through the column. |
| **B2** | **The ledger** | M | The thick-and-thin rule, the log rows for Experience and ruslanshulga.com, Stack as a three-column ruled register, Education, Contact as large copper links, the footer, and `/sprints` in the same ledger style. | The whole page in the new world, with the ship scene still a plain Theseus row. |
| **B3** | **The ship scene, static** | M | The dark stage band, the Theseus entry, the sprint rows from `readSprintLog()`, the SVG stage hull with numbers and the `:has()` highlight, and the legend. | Complete for reduced motion, no-WebGL and no-JS visitors. |
| **B4** | **The ship scene in 3D** | spike, then M | Probe spikes first (as in sprint 9): a sticky stage in CI's Chromium, draws per frame, phone framing. Then the camera frames A to C, the active row, and hover and focus. | The authored moment. |
| **B5** | **Motion finish** | S | The h2 "sets" (rule and rise), the plank seating at load, the view transition to `/sprints`. | Polish. Every visitor already has everything. |

Specs that each step will touch, and that the contract should name as expected edits:
- B1: `hero.spec` (C1–C9's box sizes and the copper spot), `hero-3d.spec`, and `sprints-entry.spec`
  (the Build log line moves into the band).
- B2: `cards.spec`, `profile-sections.spec`, `reveal.spec`'s section list.
- B3: `invariants.spec`.

### B1 checks a browser can show (grounded in the prototype)

1. The h1's computed `font-family` starts with Besley, at weight 800. Body text is Libre Franklin. No
   Geist request is made.
2. The h1's font size is 136 px ± 1 at 1440 and 64 px ± 1 at 390. The h1 fits on one line at 1440 and
   takes two lines at 390.
3. The title band is a 3 px top rule plus a 1 px rule, full content width. Its three cells contain, in
   order, `profile.headline`, `profile.location` and the "Build log · N sprints" line (C14's text
   unchanged).
4. The hull has 22 plank shapes, and exactly N (from `readSprintLog()`, capped at 22) carry a sprint
   number. The plank of the highest sprint is copper (the accent, or its 92% mix in dark). Planks with
   no sprint use the original tone.
5. The hull's bow lies within 1 px of the right content edge, and its stern is clipped by the viewport
   at 1440 and at 390. No horizontal scroll at 320 or 390.
6. At 390 the hull comes before the bio in visual order. At 1024 and up, the bio sits in cols 7–12
   above the hull.
7. LCP is the h1 at 1440 and the bio at 390, never the canvas or SVG. CLS after load is 0.
8. Reduced motion: the canvas pose is the rest pose at every scroll position, and there's no seating
   animation.
9. axe finds no serious or critical issues in either scheme. The detector reports no errors.
10. The SVG and the canvas at rest match within today's C-check tolerance (sprint 9's contract).

## 7. What it must never look like (the rubric's list, applied)

| Fails on sight | Here |
|---|---|
| Purple-to-blue gradients, glass, glow without reason | None. The only gradient is the hull's lighting, which is form. **Watch in B4:** no bloom or emissive on the copper plank (sprint 8's 92% rule). |
| Generic hero copy, centred everything | The hero copy is the owner's bio, verbatim. The composition is asymmetric: the name at full width, the bio in cols 7–12, the hull cropped at one end. Nothing is centred. |
| Emoji as icons or bullets | None. The legend swatches and the Stack rules are drawn. |
| Uniform rounded cards for everything | Zero cards and zero radii. Rows on rules. Today's card is removed. |
| Motion that decorates, or that ignores reduced motion | Each motion carries a fact (plank = sprint, the rule = a new section). Reduced motion loses only movement, never content or state. |
| Low-contrast grey on grey | axe-clean at three widths in both schemes. The rules are never text. |

impeccable's own bans that today's page breaks, and the redesign removes:
- the small tracked "EXPERIENCE" label over each section, which is a kicker above a heading;
- Geist, as an overused font.

Also not allowed: section numbers (the sprint numbers stay, because they're information),
hero-metric stat blocks, and mono used as a "technical" costume.

## 8. Team copy that needs the owner's approval

Everything else on the prototype is `content/profile.ts` verbatim, or the retros' goals as `/sprints`
already shows them.
- The nav labels: *Experience, Projects, Build log, Contact* (the existing headings, plus the existing
  "Build log").
- The legend: *Latest plank, Replaced, Original*. The station numbers 0 to 10.
- **Bold on five phrases** in the JPMorgan summary: *about 55%*, *around 8 product teams*,
  *roughly 35%*, *a day or two*, *a team of 7*. The words are unchanged; it's a choice of emphasis.
- The footer: *Ruslan Shulga · New York, NY* (both are profile facts; the pairing is the team's).
- The sprint rows show team-written goals, already public on `/sprints`.

## 9. Needs decision (owner)

1. **The concept:** the log of the Theseus, as recommended, or the brief's network concept, which I
   rejected in section 1.
2. **Clarendon (Besley) as the display face.** It's the boldest call here. The alternative is a
   grotesque display, which is safer and more familiar.
3. **The dark band in light mode** for the ship scene. Without it, the hull reads weaker on the pale
   ground and the page has no change of pace.
4. **The latest plank moves** each sprint, following the fixed order. So the hero changes after every
   merge (sprint 15's plank is lift 1, plank 0). The alternative is to pin the copper amidships and
   move the others, which is less true to the idea.
5. **Bold numbers** in the JPMorgan summary (section 8).
6. **Hull above the bio on phones,** so the object is in the first viewport. The bio still starts
   above the fold at 390 × 844.

## 10. What I couldn't verify

- No motion exists in the prototype, so the storyboard is unproven. B4 needs Probe's spike before its
  contract, as sprint 9 did.
- The LCP and CLS figures for the build: the prototype was measured from `file://`, which shows the LCP
  *element*, not mid-phone timings.
- Firefox, Safari and real devices: only Playwright's Chromium (1194) was used.
- The plank numbers on the phone stage are illegible in the still; the B4 framing (2.2×) is what
  fixes them.
