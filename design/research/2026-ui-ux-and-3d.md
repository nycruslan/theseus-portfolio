# Theseus: UI/UX and 3D research (as of 2026-10-22)

Scope: the Theseus portfolio redesign and Theseus Studio. Every claim links to its source. Tags: **[pre-2025]** = older source; **[secondary]** = third-party report, not verified at the primary source; **[judgement]** = my recommendation, not a sourced fact.

---

## A. Principles for both products

1. **Content is the hero; controls recede.** Controls sit on one functional layer above the content; no glass in the content layer ([HIG Materials, 2025-09](https://developer.apple.com/design/human-interface-guidelines/materials)). Linear: "Don't compete for attention you haven't earned" ([Linear, 2026-03-12](https://linear.app/now/behind-the-latest-design-refresh)).
2. **One primary action per view, big and labelled.** A prominent Send button was found up to 4× faster; dropping labels hurt usability; "No amount of expressive design will beat basic functionality" ([Google M3 Expressive research, 2025](https://design.google/library/expressive-material-design-google-research)).
3. **Disclose progressively.** Essentials first, the rest one step away ([HIG Layout, 2026-09](https://developer.apple.com/design/human-interface-guidelines/layout)). Stripe's 2026 homepage reveals detail on hover and uses a live GDP counter as proof ([YC Design Review, 2026-04](https://podscripts.co/podcasts/y-combinator-startup-podcast/stripe-head-of-design-katie-dill-breaks-down-their-new-website) [secondary]).
4. **Spend a novelty budget; keep everything else familiar.** Dia's test: anyone can switch "at 10am on a Tuesday" ([Browser Company, 2025-06](https://browsercompany.substack.com/p/the-strategy-behind-dias-design)); "Use concepts that people know" ([HIG principles, 2026-06](https://developer.apple.com/design/human-interface-guidelines/design-principles)).
5. **Every motion needs a job; frequency decides how much.** 100+ times a day: no animation; rare moments may delight ([Kowalski, 2026-09](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)). "Don't add motion for the sake of adding motion" ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
6. **Fast, ease-out, interruptible.** UI motion < 300 ms (press 100–160, popovers 125–200, modals 200–500); `cubic-bezier(0.23,1,0.32,1)` for UI, `cubic-bezier(0.77,0,0.175,1)` for travel, never ease-in ([Kowalski](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)). Springs: damping 0.9, stiffness 1400/700/300 by distance; colour/opacity springs damping 1 ([Material, 2025](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)). "Let people cancel motion" ([HIG](https://developer.apple.com/design/human-interface-guidelines/motion)); motion shows where things come from ([Rauno Freiberg, 2023](https://rauno.me/craft/interaction-design) [pre-2025]).
7. **Reduced motion = fades instead of movement.** Tighten springs, no z-depth animation, replace x/y/z travel with fades, no animated blur ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
8. **Depth signals hierarchy; text stays flat.** "Avoid adding depth to text"; no peripheral motion; don't rotate the world; keep "a stationary frame of reference" ([HIG Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout), [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
9. **Legibility floor = WCAG 2.2 AA:** 4.5:1 text, 3:1 meaningful graphics, 24×24 px targets, focus never hidden ([W3C, 2023, current](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)). WCAG 3's contrast method is still "yet to be determined" ([Working Draft, 2026-09-10](https://www.w3.org/TR/wcag-3.0/)) and APCA left the draft in 2023 ([Roselli, 2026-04](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)): APCA is a design aid, not compliance. Apple: no Light/Thin weights ([HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)).
10. **Show something at once; design every state.** "The best content-loading experience finishes before people become aware of it" ([HIG Loading](https://developer.apple.com/design/human-interface-guidelines/loading)). Skeletons mirror the final layout; design empty, sparse, dense and error states; no dead ends; spinner delay 150–300 ms, minimum 300–500 ms ([Vercel guidelines, 2026-10](https://vercel.com/design/guidelines)).
11. **Say what is happening in specific words:** "Summarizing key themes from your notes", not "Processing…"; failures name a next step ([HIG Generative AI, 2026-06](https://developer.apple.com/design/human-interface-guidelines/generative-ai)). Devin replaced "Deciding action" with the actual step ([Devin, 2026-10-19](https://docs.devin.ai/release-notes/overview)).
12. **Agents disclose themselves and their state at a glance:** instant feedback; visible thinking/waiting/executing/finished; stop when asked; a human stays accountable ([Linear AIG](https://linear.app/developers/aig)). Activity "clearly visible at all times" ([Microsoft Design, 2025-04](https://microsoft.design/articles/ux-design-for-agents/)).
13. **Keyboard and URL have the mouse's power:** keyboard-operable flows, `:focus-visible`, state in the URL, real links ([Vercel](https://vercel.com/design/guidelines)).
14. **Performance is design.** "If the experience runs at 10 FPS, no one will stick around" ([Bruno Simon, 2026-03](https://www.awwwards.com/brunos-portfolio-case-study.html)). LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 ([web.dev](https://web.dev/articles/vitals)).
15. **Every fact survives without WebGL, JavaScript, colour or motion.** Forced colours strips `box-shadow` and gradients and remaps SVG fill/stroke ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)); never use motion "as the only way to communicate important information" ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).

**Apple → web.** *Transfers:* the content-versus-controls layer model, progressive disclosure, reduced-motion substitutions, depth for hierarchy, minimum sizes and contrast, specific status copy, the 2026 principles. *Does not transfer:* Liquid Glass refraction (`backdrop-filter` only blurs, and heavy blur "is expensive, especially in Safari": [Kowalski](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)); the OS Reduce Transparency setting (Safari lacks `prefers-reduced-transparency`: [caniuse](https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency)); vibrancy colours, Dynamic Type (use `rem` and browser zoom), gaze hover, haptics. Even Apple added a clear-to-tinted slider in iOS 27 for readability ([TechCrunch, 2026-06-08](https://techcrunch.com/2026/06/08/apple-is-tweaking-its-controversial-liquid-glass-design) [secondary]).

---

## B. The portfolio redesign

This section is research input, not a spec. The approved direction
(`.crew/sprint/17/direction-iris.md`) and the owner's four calls decide; where this section says
"(direction)", it repeats them. Everything else here is a suggestion for Iris and Quill to weigh
when they write a sprint's contract, and a visible change to the approved design still needs the
owner. **[proposal]** marks the suggestions that change something the direction already decided.

### B1. The 2D sheet (first paint)
- **Server-render the sheet as HTML plus inline SVG.** The name is the largest paint, so LCP is text, never the drawing or a canvas (direction).
- **The title block** holds the name, the role, the bio's first two sentences and contact (direction). It answers the executive in five seconds. **[proposal]** One primary action as its largest labelled target (principle 2), with any proof numbers taken only from the owner's facts in `content/`.
- **The labelled bar** holds Work, Crew, Log, Contact, Read as page and the Full/Calm/Off control (direction). Off is everyone's default (direction). The control persists the visitor's choice (with try/catch around storage). **[proposal]** Mirror the choice into the URL, and default to Full when `prefers-reduced-motion` doesn't ask for less.
- **Draw it like a real drawing:** 2–3 stroke weights (outline, stations, construction). Meaningful lines need ≥ 3:1 contrast against the paper ([WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)); construction lines are decorative and `aria-hidden`.
- **Typography:** the direction's one family, Sofia Sans for text and Sofia Sans Extra Condensed for annotations, pairs label and copy styles the way Geist does ([Geist](https://vercel.com/geist/typography)); body ≥ 16 px; annotations ≥ 12–13 px and never essential; no Light or Thin weights ([HIG](https://developer.apple.com/design/human-interface-guidelines/typography)); measure ≤ 80 characters ([WCAG 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html)).
- **Annotations are real text** (`<text>` or positioned HTML): selectable, translatable, forced-colours safe.
- **No line-drawing reveal before the text is readable** (see E).

### B2. The facts and `/read`
- **`/read` is the semantic page** (direction: "Read as page"): headings, lists and tables, works with JavaScript off, prints cleanly. On `/`, the no-JS, print and Off baseline is the 2D sheet with the planks drawn (direction).
- **Move between `/` and `/read` with a view transition:** React 19.3's `<ViewTransition>` is stable and cross-fades by default; it animates `startTransition`, Suspense reveals and `useDeferredValue` updates ([React, 2026-09-09](https://react.dev/blog/2026/09/09/react-19-3)). Support is 92.9%, Firefox 144+ ([caniuse](https://caniuse.com/view-transitions)). Keep it ≤ 300 ms.
- **Each fact deep-links** as `/read#fact-id` ([Vercel](https://vercel.com/design/guidelines)). Facts come from `content/` verbatim; their wording is the owner's.
- **No facts inside the 3D scene.** If a fact points at the hull, use a DOM label with a screen-space leader line (principle 8).

### B3. The 3D model and the loft
- **Load order:** HTML/SVG paints → on idle, dynamic-import the 3D chunk → `await renderer.init()` ([manual](https://threejs.org/manual/en/webgpurenderer.html)) → render one hidden frame → show the canvas registered exactly over the SVG's profile, with no cross-fade and no pop (direction). Size the `OrthographicCamera` frustum to the SVG `viewBox` in CSS pixels so the handoff is invisible [judgement].
- **The one camera move** is the direction's: orthographic on the inked profile, then a dolly-zoom to a 30° lens that holds the sheet's size, ending at the settled three-quarter pose; the page, the title block and every word never move. Technique:
  1. Swap to a perspective camera with a very long lens (FOV ≈ 1°), placed so the hull's framed height matches: `d = h / (2·tan(fov/2))` ([Wikipedia](https://en.wikipedia.org/wiki/Dolly_zoom)); the usual trick is a near-zero FOV at the switch ([three.js forum](https://discourse.threejs.org/t/how-to-animation-switch-camera-from-perspective-to-orthographic-like-3d-program-maya-blender-unity-etc-in-three-js/9470) [pre-2025]).
  2. Dolly in while widening the FOV to 30°, holding the hull's size.

  A strong dolly zoom causes "a sensation of disorientation and discomfort" ([Wikipedia](https://en.wikipedia.org/wiki/Dolly_zoom)); the still page is the stationary frame of reference that keeps it comfortable ([HIG](https://developer.apple.com/design/human-interface-guidelines/motion)).
- **Timing:** once per visit, 2.4 s with an exponential ease-out, skippable by any input (direction); Kowalski exempts marketing sites from his 300 ms rule ([source](https://emilkowal.ski/ui/you-dont-need-animations)). **[proposal]** Test 1.2–1.8 s in the B3 spike. Never bind the camera to scroll (see E).
- **Calm and reduced motion open settled; Off never loads WebGL** and shows the 2D sheet with the planks drawn (direction). **[proposal]** A static AVIF render of the hull for Off, if it never outpaints the name as LCP.
- **The white card look without textures** (the direction's card model on drafting film, no textures but a 64 px hatch) [judgement unless linked]:
  - warm-white standard or Lambert node material, roughness ≈ 1; a hemisphere light plus one soft directional; no real-time shadow maps (PCFSoftShadowMap is gone in [r186](https://github.com/mrdoob/three.js/releases/tag/r186));
  - AO baked into vertex colours offline, or faked in TSL from normals and plank edges;
  - the shadow on its own half-breadth plan (direction) as one pre-blurred contact-shadow plane (`webgl_shadow_contact` / `webgpu_shadow_contact` [examples](https://github.com/mrdoob/three.js/tree/r186/examples));
  - ink-coloured plank edges as fat lines (`webgpu_lines_fat`), so the 3D reads as the same drawing.
- **Draws (≤ 8, direction):** all planks in one instanced or batched mesh with a per-plank state attribute, seams as one line batch, the deck and the shadow (direction). `BatchedMesh` gives one draw with per-object culling ([docs](https://threejs.org/docs/pages/BatchedMesh.html)). Transparent canvas; background in CSS.
- **Render on demand** (direction): no idle loop; render on tween ticks and crew events (`setAnimationLoop(null)` between them). DPR ≤ 1.5 on phones and 2 on desktop, stepping quality down above 22 ms a frame (direction); `renderer.info` counts draws.
- **Keyboard:** the canvas is `aria-hidden` because every 3D object has a DOM twin (a fact or a revision row); focusing the twin highlights the object.

### B4. The crew at work (`/crew`)
- **Only real events, each with one mark, and an honest rest state when the crew is idle** (direction); LIVE or REPLAY with timestamps, no theatrical typing ([HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)). When idle, say so and offer the last run.
- **The plank states are the direction's:** ink and card merged, graphite in progress, copper live this minute, vellum removed.
- **One DOM "now" line** in specific words, e.g. "Pixel is fitting plank 14 of 22" (principle 11), with `aria-live="polite"` throttled to state changes ([Vercel](https://vercel.com/design/guidelines)). Live updates running past 5 s need a pause control ([WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).
- **[proposal]** Label agents as AI (avatar and badge, [Linear AIG](https://linear.app/developers/aig)), with the same few agent states everywhere (working, waiting, blocked, done), as Devin and Linear do ([Devin](https://docs.devin.ai/release-notes/overview), [Linear](https://linear.app/developers/agent-interaction)).

### B5. The log and the ghost hull (`/log`)
- **The revision table is a DOM list:** each plank, who drew, checked and tested it, and the approval (direction). Show change size as `+42 −18`, the way [Claude Code](https://code.claude.com/docs/en/claude-code-on-the-web) does.
- **The ghost hull** is the removed planks in vellum (direction). **[proposal for Iris]** Thin ink lines rather than a translucent fill: one draw, no transparency sorting, and it matches the sheet; ≥ 3:1 if it carries meaning.
- **[proposal]** Selecting a row highlights its plank, and the camera moves between the brief's named viewpoints only if the plank is off-screen (Calm: cut); `?entry=` in the URL, and ↑/↓ with Enter.
- **One solid panel material,** never glass on glass ([HIG](https://developer.apple.com/design/human-interface-guidelines/materials)).

---

## C. The Studio (a 3D-hero live view)

Input for the owner's Studio work, not the crew's: the crew doesn't work on the Studio (CLAUDE.md).

1. **Four layers, each with one job, nothing repeated:** **Stage** (3D station: *where*, *who*); **Now** (caption line + crew chips: *what's happening*); **Panels** (board: *what*; threads: *why*; profiles: *who*; closed by default); **Transport** (play bar: *when*).
2. **The three-second glance test:** Is this live? Who is working? On what? Is it going well? Answer with a LIVE/REPLAY badge and time, text-labelled state chips, the now line, and an "n of N" count.
3. **Dock the panels; don't float them.** Figma shipped floating panels in UI3, found they crowded the canvas, and reverted to fixed, resizable panels ([Figma](https://www.figma.com/blog/our-approach-to-designing-ui3/) [pre-2025]). visionOS ornaments attach controls to a window edge, stay visible, and are few in number ([HIG Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments)). Show one panel at a time; on mobile it becomes a bottom sheet.
4. **Camera rules.**
   - Auto-follow only on major events (handoff, blocker, ship), behind a "Follow" toggle; never while the visitor is interacting.
   - Constrained orbit (no roll), a "Reset view" button, and fades rather than long flights ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
5. **Moment cards** only for decisions, handoffs, blockers and ships: verb-first headline, agent, time, "Jump to". Each is a tick on the play-bar timeline, as in Devin's timeline ([Devin](https://docs.devin.ai/release-notes/overview)).
6. **Agent profiles:** role, current task, recent actions and a plan checklist (pending, in progress, done, cancelled) ([Linear plans](https://linear.app/developers/agent-interaction)). Name exactly what an agent is waiting on, e.g. "Approve skill", not "Approval required" ([Devin, 2026-09-30](https://docs.devin.ai/release-notes/overview)).
7. **The play bar** is a familiar media transport: Space play/pause, ←/→ between moments, 1×/2×/4×, scrubbing renders on demand, `?t=` in the URL, "Jump to live".
8. **Motion:** idle quietly, render on demand, no ambient loops by default ([WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). Event animations run 200–500 ms, and Calm switches everything to fades.
9. **"How it works"** is an inline three-step card that can be skipped and reopened with "?" ("make it easy to skip or escape", [HIG](https://developer.apple.com/design/human-interface-guidelines/design-principles)).
10. **States.** *Loading:* DOM shell and station poster at once, skeletons mirroring panels. *Empty:* "Crew off shift. Next run 14:00 UTC. Watch the last run →". *Error:* "Live feed lost at 13:42. Showing replay; retrying…" ([HIG Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai)).
11. **Legibility over 3D.** Panels use one solid or frosted material. Use a scroll-edge effect only where content scrolls under a bar ([HIG Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views)). Because Safari lacks `prefers-reduced-transparency`, Calm also makes panels solid.
12. **Accessibility:** board and log are DOM, with Tab focus mirrored to a 3D highlight; targets ≥ 24 px, 44 px on touch ([Vercel](https://vercel.com/design/guidelines)). `@react-three/a11y` adds focus and roles to R3F ([docs](https://a11y.docs.pmnd.rs/introduction)), but its last release is from 2022 [pre-2025]: test before relying on it.

Patterns shared by current agent UIs: grouped, iconised activity ([GitHub](https://github.blog/changelog/2026-01-26-introducing-the-agents-tab-in-your-repository)); live hover previews ([Devin](https://docs.devin.ai/release-notes/overview)); a live setup checklist and retractable queued messages ([Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)); tiled parallel agents ([Cursor 3.0, 2026-04-02](https://cursor.com/changelog/3-0), [3.1](https://cursor.com/changelog/3-1)); task lists ([v0, Aug 2025](https://community.vercel.com/t/agent-mode-feedback-thread/18428) [secondary]).

---

## D. 3D tech choices and budgets

| Piece | Current as of 2026-10-22 |
|---|---|
| three.js | **r186** ([GitHub release, 2026-09-24](https://github.com/mrdoob/three.js/releases/tag/r186); npm `three@0.186.1`) |
| WebGPURenderer | Auto-falls back to WebGL 2; no `ShaderMaterial`, `onBeforeCompile` or `EffectComposer`; still "in an experimental state", some scenes run faster on WebGLRenderer, which stays "the recommended choice for pure WebGL 2 applications" ([manual](https://threejs.org/manual/en/webgpurenderer.html)). |
| R3F | **9.8.2** stable (2026-10-15); React 19.3 support since 9.8.0 ([release](https://github.com/pmndrs/react-three-fiber/releases/tag/v9.8.0)). **10.0.0-alpha.6** (2026-10-17): WebGPU default, GLSL under `/legacy`, renderer lazy-loaded on first `<Canvas>`, TSL hooks in `@react-three/tsl` ([release](https://github.com/pmndrs/react-three-fiber/releases/tag/v10.0.0-alpha.6)). Don't ship the alpha. |
| drei | **10.7.9** stable (GLSL/WebGL). The **11.0.0-alpha.7** WebGPU port is unfinished: BlurPass and BakeShadows are still "todo" ([release](https://github.com/pmndrs/drei/releases/tag/v11.0.0-alpha.7)). |
| React / Next.js / GSAP | 19.3.1 / 16.4.2 / 3.15.0 (npm registry, checked 2026-10-21) |
| WebGPU reach | 87.8% global ([caniuse](https://caniuse.com/webgpu)). Chrome 113+ (Android 12+ on ARM/Qualcomm/Intel since 121); Safari 26+; Firefox Windows 141+, macOS 145+; Firefox Linux Nightly-only, Android behind a flag ([gpuweb status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)). |
| Scroll-driven CSS animations | Chrome 115+, Safari 26+; Firefox from 159, due 2026-10-27 per `design/brief.md` [unverified: re-check on [caniuse](https://caniuse.com/mdn-css_properties_animation-timeline_scroll)] |

**Measured bundle sizes.** I bundled each case with esbuild 0.25 from `three@0.186.0` (the current patch, 0.186.1, is unlikely to differ), minified and tree-shaken. Sizes are in KiB.

| Bundle | min | gzip | brotli |
|---|---|---|---|
| WebGPU: renderer, standard and basic node materials, Instanced and Batched meshes, 2 lights, TSL nodes | 894 | **245** | 197 |
| WebGPU floor: 1 mesh, basic material | 769 | 211 | 171 |
| WebGL equivalent of the first row | 542 | **136** | 112 |
| GSAP core (`gsap.to`) | 69 | 27 | 24 |
| R3F 9.8.2, excluding React and three ([Bundlephobia](https://bundlephobia.com/package/@react-three/fiber@9.8.2)) | 179 | 56 | n/a |

Vercel serves brotli whenever the browser accepts it ([Vercel docs](https://vercel.com/docs/how-vercel-cdn-works/compression)).

**Against the "≤ 250 KB gzip" 3D chunk** (sizes here are KiB; 1 KiB = 1.024 kB). `2027-redesign.md`
set that budget from three.js at about 185 KB as a full import, which is the WebGL build; these
measurements of the WebGPU build replace it for the B3 decision: the direction's stack, a WebGPU build with the scene's materials, batched mesh and lights (245 KiB ≈ 251 kB, already at the limit) plus GSAP (27 KiB), is ≈ **272 KiB ≈ 279 kB gzip: does not fit.** The renderer-only floor is 211 KiB; React Three Fiber, which the direction doesn't use, would add another 56 KiB.

Options:
- **A. [proposal, for the B3 decision] The portfolio on WebGL:** vanilla three.js, **WebGLRenderer**, small GLSL shaders and a 30-line custom tween: about 140 KiB gzip. At ≤ 8 draws WebGPU's lower CPU overhead buys nothing, and WebGL 2 reaches more devices [judgement].
- **B. [proposal, for the B3 decision] Keep WebGPU and TSL:** vanilla `three/webgpu`, no R3F or GSAP, budgeted as **brotli on the wire** (about 200 KiB): fits, with the manual's "experimental" caveat. Enforce size in CI.
- **The Studio has no stated size budget:** use R3F 9.8.x with drei 10 (WebGL path) behind `next/dynamic` now, and revisit R3F v10 at its beta.

**Skip for now:**
- **Worker or OffscreenCanvas rendering.** three.js r186 ships only a WebGL worker example, and at ≤ 8 draws the main thread isn't the bottleneck [judgement].
- **Gaussian splats.** Khronos's `KHR_gaussian_splatting` became a release candidate on 2026-02-03, and I found no ratification notice since ([Khronos](https://www.khronos.org/news/press/gltf-gaussian-splatting-press-release)). Splats suit photographic captures, not a white-card hull. Spark 2.4 is the three.js option if ever needed ([repo](https://github.com/sparkjsdev/spark)).
- **Scroll-linked cameras.** Use scroll-driven CSS for small DOM progress indicators only.

**Use View Transitions only for DOM↔DOM changes.** The old snapshot is static ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)), so a live canvas would freeze mid-move. Animate the canvas inside WebGL.

**Monitoring:** `renderer.info` (draw calls), `PerformanceMonitor` (frame rate), `web-vitals` field data, and frame-time traces on a mid-range Android phone.

---

## E. Clichés and anti-patterns to avoid in 2026

- **Long scroll-jacked camera fly-throughs.** Even April 2026's Site of the Month, Oryzo, drew forum feedback that its scrolling took too long and became tiring before the halfway point ([three.js forum, 2026-04-01](https://discourse.threejs.org/t/oryzo-ai-a-wearable-product-in-the-ai-era/90696)).
- **Preloaders with % counters** that gate the page. Show content first ([HIG Loading](https://developer.apple.com/design/human-interface-guidelines/loading)).
- **One-click WebGL decoration:** magnetic or custom cursors, liquid-distortion hovers, glowing particles, giant "blob" heroes, and kinetic type on every heading ([wannathis](https://wannathis.one/blog/web-design-trends-2026), [StudioMeyer, 2026-05](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check) [secondary]).
- **Glass everywhere, glass on glass, and text on clear glass with no dimming layer** ([HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)).
- **Line-draw reveals and staggered fade-ups** that delay reading for an audience deciding in seconds [judgement].
- **Small-motion mistakes:** animating frequent or keyboard actions, `transition: all`, entering from `scale(0)`, and ease-in curves ([Kowalski](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)).
- **Ambient loops longer than 5 s with no pause** ([WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).
- **Navigation or text that lives only inside the canvas** ([forum, 2025–26](https://discourse.threejs.org/t/accessibility-for-3d-websites/87092)).
- **Fake agent theatre:** typewriter text, "Thinking…" spinners, and raw unfiltered logs ([HIG Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai), [GitHub](https://github.blog/changelog/2026-01-26-introducing-the-agents-tab-in-your-repository)).
- **Vertigo-strength dolly zooms, rotating the world, and motion at the screen edges** ([Wikipedia](https://en.wikipedia.org/wiki/Dolly_zoom), [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
- **WebGPU, TSL or splats worn as badges** rather than chosen for a need (see D).
- **Basic legibility failures:** disabled zoom, light grey thin type, and icon-only actions with no labels ([Vercel](https://vercel.com/design/guidelines), [HIG](https://developer.apple.com/design/human-interface-guidelines/typography), [Google research](https://design.google/library/expressive-material-design-google-research)).

**What the winners do instead.** Site of the Year 2025: Lando Norris (OFF+BRAND); Developer SOTY: Messenger by abeto ([Awwwards](https://www.awwwards.com/annual-awards/winners)). 2026 Sites of the Month include Bruno Simon's portfolio (Jan), Oryzo AI by Lusion (Apr) and ERA Residence (Aug) ([Awwwards](https://www.awwwards.com/websites/sites_of_the_month/)). They share one strong concept, one interaction model and ruthless performance work: Bruno used instancing, merged geometry, one palette texture, compressed textures and a lighter mobile preset ([case study](https://www.awwwards.com/brunos-portfolio-case-study.html)).
