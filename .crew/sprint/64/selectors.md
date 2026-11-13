# Sprint 64: the hooks T10 to T15 read (Probe)

Pixel (the controller) and Forge (the card) build to these; `e2e/trials-drag.spec.ts` reads them.
Ta's hooks (`e2e/trials.spec.ts`, its header) are unchanged. If one doesn't fit, tell Probe and
Atlas before building around it.

## The controller (Pixel)

- **The corner:** one `<button type="button" data-corner>` in `main`, at the drawn frame's
  bottom-right corner, its own box at least 44 × 44 CSS px at every width. Its accessible name
  holds the shown window as spoken, "1440 by 900" (Iris's "Window corner, 1440 by 900": a screen
  reader says × as "times"; Atlas's ruling), and follows every settle. `[data-size]` keeps "×". Computed `touch-action: none` on it and on nothing else in the page.
- **Mid-drag:** `[data-dragging]` is on `[data-corner]` from pointerdown (or touchstart) to release,
  and absent at rest. While it's there, `[data-freeboard]`'s attribute is the live measure to 0.1
  and `[data-freeboard]` carries `data-measure="live"`; at rest `data-measure` is absent or
  `"sweep"` and the attribute is the sweep's value (Ta). The frame's document is the window under
  the hand (`clientWidth` w, `innerHeight` h), and `[data-size]` and the inputs follow it.
- **The inputs:** Ta's `input[name="w"]` and `input[name="h"]`. Their values follow the frame live.
  Probe edits one with `fill()` then presses Tab: the frame moves to the typed window and settles
  (on `input` or `change`, your call).
- **Keys on the corner:** ArrowLeft and ArrowRight one width step (−16, +16), ArrowUp and ArrowDown
  one height step (−5, +5), PageUp and PageDown ten height steps (−50, +50), Home 320 × 460, End
  1920 × 1100. Each settles at once. Focus stays on the corner.
- **The live region:** one `[data-trials-live]` in the server HTML, `aria-live="polite"` (or
  `role="status"`), empty at load. Its text is set once per settle (holding the window as spoken,
  "390 by 664", and the verdict as `[data-verdict]` words it) and not at all during a drag. After
  Copy link it says so: its text matches `/copied/i` (Iris's words; tell Probe if they can't).
- **Copy link:** one `<button type="button" data-copy>` in `main`. It writes the settled window's
  absolute URL (`location.origin` + its address, or the canonical's href) with
  `navigator.clipboard.writeText`.
- **Scripts off:** no `[data-corner]` or `[data-copy]` shown (absent, or `hidden`), so Ta's page is
  unchanged.
- **Loading:** at load the page's script beyond the 404's is at most 1,024 B gzip; nothing else is
  requested (no script) until the first pointerdown or focus on the corner or either input.
  Probe moves the mouse over the page and scrolls first: neither is a touch.
- **At rest:** no `requestAnimationFrame` call from load to the first touch, nor from 1 s after a
  settle.
- **Under the hand (T14, 4x CPU):** every Event Timing entry for a pointer event within 200 ms,
  gated. Chromium gives `pointermove` no Event Timing entry, so T14 reports the drag's long
  animation frames (their count over 200 ms and the longest) without failing on them (Atlas's
  ruling).
- **The address:** `history.replaceState` to the settled window's address (`/trials` for 1440 ×
  900); `document.title` and `link[rel="canonical"]`'s href become the server's for that address.

## The card (Forge)

- `app/trials/opengraph-image.tsx` (1440 × 900's) and `app/trials/[window]/opengraph-image.tsx`:
  one `og:image` and one `twitter:image` per swept window's page, `image/png`, 1200 × 630, its
  `og:image:alt` the card's alt. A window off the sweep never gets one: the image's path with the
  window replaced by `330x560` or `1921x900` is not a 200 `image/png`.
- **The words:** `lib/trials-card.ts` exports `trialCard(win: readonly [number, number])`, giving
  `{ lines: readonly string[]; alt: string }` for a swept window and `undefined` off the sweep.
  Both image files import it and draw `lines`. `alt` and the joined `lines` hold the size
  ("320 × 568"), the freeboard to one decimal with "px", and the verdict as `[data-verdict]` words
  it. The alt also holds the signed value ("−6.2", U+2212, or "+37.0"); the lines read
  `Under by {f} px` for a sinking window, and 320 × 568's hold "Under by 6.2 px. The crew's own
  gap." (Atlas's ruling: the quote is the drawn lines'). Probe reads the module in Playwright's runner, which doesn't map `@/`: its value imports,
  and those of every module it reaches, are relative (`./trials`), never `@/` (type-only imports
  are fine). `lib/trials-words.ts` imports values by `@/` today.
