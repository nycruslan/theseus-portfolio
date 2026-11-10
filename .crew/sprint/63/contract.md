# Sprint 63 contract: Ta, any window, as a page

Quill wrote this in sprint 62 (`.crew/sprint/62/first-contract.md`, Lens's nits folded in); it is
copied here unchanged as the sprint's contract. Changes made during the build are recorded in
`decisions.md`.


**The outcome.** On the trials page a visitor sees Ruslan's first page, as the site builds it, in a
frame the size of the window in the address, with the frame's foot drawn as the waterline and the
contact links' freeboard beside it. The page says what the crew's record answers for that window:
the checks that hold it, a near miss, the crew's own gap, or a window no check claims. The crew's
windows are links, and a form takes any window. It all works with no script, and every window is an
address. Ta adds no script, and nothing on `/`, `/log` or `/crew` changes (`plan.md`).

## The rules, word for word (Forge's page and sweep, Probe's oracle)

- **The windows.** The grid: widths 320 to 1920 by 16, heights 460 to 1100 by 5 (13,029). The
  pinned windows (`PINS`, below). The named windows, Iris's near misses off the grid: 456 × 465,
  792 × 575, 1160 × 635 and 1366 × 595. Together, the swept windows.
- **The addresses.** `/trials` is the 1440 × 900 window, and `/trials/1440x900` answers 308 to it.
  `/trials/<w>x<h>` (`^[1-9]\d*x[1-9]\d*$`) is 200 for a swept window. Any other window with
  320 ≤ w ≤ 1920 and 460 ≤ h ≤ 1100 answers 307 to the grid window `w' = 320 + 16·round((w − 320)
  / 16)`, `h' = 460 + 5·round((h − 460) / 5)`, halves rounding up. Anything else is the site's 404.
  The form's action is a route handler, `/trials/go?w=<w>&h=<h>`, which answers 303 to the
  window's address by the same rules (a swept window to itself, an off-grid one to its grid window),
  and to `/trials` when either is missing or not a number. `/trials` itself reads no `searchParams`,
  so it stays prerendered under `cacheComponents` (Lens's nit on #129).
- **The freeboard.** On the frame's address as a top-level page at a viewport of w × h, with
  scripts off and `document.fonts.ready`: the contact links are the title block's (`main > header`)
  links to `profile.links`, as B1.1 reads them. The links' foot is the largest `bottom` of the
  client rects of a Range over each link's contents. Freeboard = h − the links' foot, in CSS px. It
  is shown signed to one decimal; the answer's kind reads the unrounded value.
- **The answer's kind,** the first that applies: **the crew's own gap** (a pinned window that
  sinks, freeboard < 0; today only 320 × 568); **held** (a pinned window); **a near miss** (0 ≤
  freeboard < 1); **unclaimed, under** (freeboard < 0); **unclaimed, afloat**. The sentences are
  Iris's, and the check quotes them.
- **`PINS`.** Every window of `/` at which a kept check asserts the title block's contact links
  inside the viewport (B1.1, W1 to W17, P3, P8, B4.22, H9 to H11, as each reads them), plus 320 ×
  568, which W8 reports and doesn't assert. Each window lists its checks; each check carries
  Iris's sentence for what it holds, the sprint whose contract wrote it, and its spec file and
  line. The page's table and Probe's oracle are briefed this word for word.

## Iris's calls come first

1. **Placement** at 1440 × 900, 390 × 664 and 320 × 568: the frame scaled to its column, the
   waterline and the dimension, the number and verdict, the rules, the answer, the crew's windows
   and the form. Her frames (`design/trials-1440.webp`, `trials-390.webp`) put the frame first and
   the readout beside it. The frame shows the feed's down state, so it has no pencil row or copper
   (`plan.md`, call 3); she may reverse that only with a truthful answer for script-off readers.
2. **The words:** the h1, the dare, the verdict and answer for each kind, each check's sentence
   (no codes like "W1" and no paths: `plan.md`, call 7), the form's labels and button, each
   window's title and description, and the frame's title.
3. **No motion control** on the page: nothing on it moves in Ta.

## Checks

- **T1 Every window is an address.** `/trials` and the swept windows are 200 with scripts on and
  off: all of `PINS`, the named windows, the grid's four corners and 50 grid windows from a fixed
  seed. 330 × 560 answers 307 to `/trials/336x560`; `/trials/1440x900` 308 to `/trials`; 319x568,
  1921x900, 320x1101, 0320x568 and 320x568x2 are 404. `/trials/go?w=1366&h=595` answers 303 to
  `/trials/1366x595`, `?w=330&h=560` 303 to `/trials/336x560`, and `?w=abc` 303 to `/trials`. Each window's title and description carry
  its size and its verdict; its canonical is its own address. The sitemap lists `/trials` and no
  window page and not the frame's address; robots disallows neither.
- **T2 The frame is the page, at the window.** In `main`, one `iframe` whose `sandbox` is exactly
  `allow-same-origin`, `inert`, titled with the window, its box sized in the server HTML. Read
  through the parent's `contentDocument`, scripts on and off: its document is w × h exactly
  (`clientWidth` w, `innerHeight` h), never scrolls and draws no scrollbar, and its `main` equals
  the `main` of `/` in the feed's down state from the same server, character for character
  (React's generated ids aside). CI's suite server is the down state; under `PLAYWRIGHT_BASE_URL`
  this clause is skipped with that reason, since a deployment's `/` renders the live feed (Lens's
  nit on #129).
  The frame runs no script: no canvas in it, no request for the 3D chunk or `/api/crew`. Drawn, its
  box keeps w:h within 1 px and stays inside its column at every viewport from 320 to 1920.
- **T3 The freeboard and the waterline.** `[data-freeboard]` shows the sweep's value for the
  window, and it equals a direct measure by the rule within 0.5 px at 320 × 568, 390 × 664, 1024 ×
  640, 1056 × 630, 1366 × 595, 1366 × 625 and 1440 × 900. Production read −6.2, 201.8, 11.7, 0.2,
  0.7, 21.7 and 29.2 on 10 Nov (Iris's sweep and my re-measure); below 1024 those hold in every
  state, and from 1024 the build's sweep governs. The waterline is drawn at the frame's foot (within 1 px), and the dimension runs
  from the links' foot, as scaled, to the waterline, within 1 px. The measure inside the frame on
  the trials page equals the top-level one within 0.5 px.
- **T4 The sweep is current.** The committed sweep holds every swept window: its freeboard to 0.1
  px and whether anything scrolls sideways, with the commit and Chromium it was taken on. It is
  imported, never read at render. A fresh measure of the build at every `PINS` window, the named
  windows and 100 grid windows from a fixed seed equals it within 0.5 px, and nothing scrolls
  sideways. A red names the command that rewrites it.
- **T5 The rules and the answer.** For a `PINS` window, one rule per check: Iris's sentence, its
  sprint (a merged retro), and a link to its spec file and line at the build's commit, as the
  keel's quotes link theirs (`lib/keel.ts`). For any other window, one line says no check claims
  it. The answer is the rule's kind in Iris's words: 320 × 568 the crew's own gap (with Atlas's
  sprint 44 ruling), 1440 × 900 held, 1366 × 595 a near miss, 320 × 460 unclaimed and under, 1920
  × 1100 unclaimed and afloat. No visible text on the page has a check code
  (`\b[A-Z]{1,2}\d+(\.\d+)*\b`) or a URL path.
- **T6 Choose a window, without script.** A `form` with Width and Height (labelled number inputs,
  the grid's limits, required) and a submit button. Each `PINS` window is one `a[data-window]` to
  its address, the shown one `aria-current="page"`. The walk, scripts off at 390 × 844: `/trials`,
  then 320 × 568's link (the gap shows), then 1366 and 595 in the form and submit (the near miss
  shows, at `/trials/1366x595`, through `/trials/go`'s 303), then Back lands on 320 × 568.
- **T7 In the first screen.** At 1440 × 900, 390 × 664 and 320 × 568, light and dark, scripts
  off, the h1, the window's size and the freeboard with its verdict are wholly in the viewport,
  and the frame's top starts in it. At 1440 × 900 and 390 × 844 the waterline and the answer's
  first line are in it too. Where the answer lands at 390 × 664 and 320 × 568 is reported. Iris's
  placement may pin more, never less.
- **T8 Accessible, still and cheap.** On `/trials` and `/trials/320x568`, in T8's own loop, not
  `ROUTES`: axe (no serious or critical), the tokens, no overflow from 320 to 1440, targets 44 px
  below 1024 and 24 × 24 from it, one main, no skipped heading, nothing animating. Tab from the top
  never focuses anything inside the frame. In forced colours the waterline and the dimension
  show. No painted colour on the page is `--accent`'s. Script beyond the 404's is 0 B on both
  (B2.10's method). LCP is text in main, outside the frame, within 2,500 ms at 4x CPU at 1440 × 900
  and 390 × 844. CLS is 0 from load to rest + 2 s at 320, 390 and 1440.
- **T9 The header.** The frame's address sends the site's CSP with `frame-ancestors 'self'` and
  nothing else changed. `/`, `/trials`, a window page, `/log`, `/crew`, `/read` and a 404 still send
  `frame-ancestors 'none'`. A page on another origin (`page.route` on a made-up host) can't frame
  the frame's address. The frame's address is `noindex`, canonical to `/`. No page of the trials
  logs a Content Security Policy refusal.

## Kept checks this touches

Read before writing this. Ta adds no link, Tab stop or box to `/`, `/log` or `/crew`, so none of
the 73 `setViewportSize` pins, the link allowlists (B4.8, B5.6 C5.3) or the Tab bounds see it.

| Check | What it pins | With Ta |
|---|---|---|
| "pages carry the security headers", `one-site.spec.ts:343` | `/` sends `frame-ancestors 'none'` | Green, unedited, while the rule is scoped to the frame's address. If Forge's scratch build shows it can't be, `/` gets `'self'`: a named rewrite (`'self'` on `/`, plus T9's other-origin clause) for Lens, with the reason. |
| "the policy blocks nothing the pages need", `:349` | no CSP refusal on its list | Unedited; T9 covers the trials. |
| B5.2 (`log.spec.ts:663`), B2.11 (`read.spec.ts:1009`), B4.1 (`crew.spec.ts:357`), `smoke.spec.ts:38` | the sitemap: contains, and the records exactly | Green: `/trials` isn't a record. |
| B2.9's `ROUTES` loops (`helpers.ts:32`) | the invariants on nine routes | Unedited; T8 runs its own loop. |
| B2.10 (`read.spec.ts:856`), B4.14 (`crew.spec.ts:1333`) | script bytes on `/`, `/log`, `/log/13`, `/read`, `/crew` | Unedited; before and after reported, equal. |
| B1.10 (`sheet.spec.ts:1392`) | each next/font import once in `app/` | Green if the page takes its faces from `app/fonts.ts`. |
| `invariants.spec.ts:291` | no colour literal in `app/` or `components/` | Applies to the new code. |
| W1 to W17, B1.1, P3, P8, B4.22, H9 to H11 | `/`'s first screen | Unedited. If Forge moves `/`'s render into a component the frame's address shares, these and T2's `main` equality are the proof. |
| B2.8 (`not-found.spec.ts:38`) | the 404 | Green: unknown windows use it. |
| `one-site.spec.ts:236` | `/llms.txt` | Unchanged. |

**Before the build,** Probe runs the unedited suite on a scratch build with a bare Ta, the contract
mutant: the route and frame unstyled, the header rule, the sitemap line, a stub sweep. I expect no
red. Every red goes into the PR as a named rewrite before Forge's build is final.

## Budgets

| Budget | Check |
|---|---|
| 0 B of script beyond the 404's on the trials page | T8 |
| `/`, `/log`, `/crew`: 0 B change; `/`'s first screen unchanged | B2.10, B4.14, W1 to W17, B1.1, P3, P8, H9 to H11, unedited; T2 |
| The 3D chunk untouched: no import of three | B3.6, B5.23, B4.40, unedited |
| The sweep: at most 64 KB raw, in the server bundle only | T4, reported |
| LCP text outside the frame; CLS 0 | T8 |
| No new face | B1.10, B2.10, unedited |
| CI: each shard under 20 minutes | reported: T1, T3 and T4 load about 200 windows |

## Out of scope

- The sliders, the corner, live measuring and the card (Tb); the chart, the fits and "found"
  (Tc); the doors from Crew and the Log (Td); a scripted or live frame (after the demo).
- Anything on `/`, the bar, `/llms.txt`, owner paths and `content/`.

Alongside, Pixel's spike for Tb in a scratch worktree (`plan.md`, Tb). Nothing here waits for the
owner.
