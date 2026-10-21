# Sprint 13: Probe's checks for `/sprints` (PR A)

`e2e/sprints.spec.ts` holds C1 to C12 of `.crew/sprint/12/contract.md` ("PR A: the route"), one
`describe` per number, each test titled with its number, plus C13.1 (the contract's one spec scan).
It was written before any product code and is red for the right reason: no route (every page check
gets a 404 and says so), no reader (C12 names the missing module). No `test.skip`, `fixme` or `fail`.

## The interface Forge builds to

C12 calls the reader through a dynamic import of `../lib/sprint-log`, so the file and the names
below are fixed. (The spec loads it from a path held in a variable on purpose: a plain import would
fail `pnpm typecheck` and the loading of the whole spec file before the build, so C1 to C11 would
report an error instead of the missing route. This way CI's `check` goes red in the e2e step, and
only C12 and C13.1 fail on the reader.)

```ts
// lib/sprint-log.ts: imports only node:fs and node:path, by relative or node: specifiers.
export interface SprintEntry {
  /** The retro's `sprint`: a positive integer equal to its folder's number. */
  sprint: number;
  /**
   * Presentation applied: a leading /^\s*roadmap item(\s+\d+)?\s*:\s*/i removed, backticks removed,
   * trimmed, first letter upper-cased, in that order. Never blank (a blank goal throws).
   */
  goal: string;
  /** Exactly "S", "M" or "L"; undefined for anything else or when missing. */
  size?: "S" | "M" | "L";
  /** A positive integer; undefined for anything else (a string "36", -1, 0, 2.5) or when missing. */
  pr?: number;
  /** true exactly when `outcome` is a string matching /\bneeds-owner\b/i; false otherwise. */
  ownersCall: boolean;
  /**
   * `wentWrong` if it is an array, else `went_wrong` if it is an array, else []. An item is a string
   * or an object with a string `what`; anything else is skipped, and so is a blank text. Backticks
   * removed and each text trimmed (inner whitespace is left alone; the spec squashes both sides).
   * The first three kept items, in the file's order. Never undefined: [] when there are none.
   */
  wentWrong: string[];
}

/** Every `<dir>/<n>/retro.json`, newest (highest `sprint`) first. `dir` defaults to
 *  join(process.cwd(), ".crew", "sprint"). */
export function readSprintLog(dir?: string): SprintEntry[];
```

Rules the tests hold it to (all from the contract's "data rules"):

- **Which folders:** names that are all digits; a folder with no `retro.json` is skipped without a
  word; an empty `dir` gives `[]`.
- **Throws** (an `Error` whose `message` contains the file's path, built as
  `join(dir, folderName, "retro.json")`, plus the reason) for: invalid JSON; a missing `sprint`;
  `sprint` not a positive integer (`"7"`, `0`, `1.5`); a `goal` that is missing, not a string or blank
  (after the presentation, so `"Roadmap item:"` is blank); a `sprint` that differs from its folder's
  number; a `sprint` repeated by another file. The repeat case names the path of either of the two
  files.
- **Never throws for an optional part** (`size`, `pr`, `outcome`, `wentWrong`/`went_wrong`, items):
  the part is `undefined` / `false` / `[]` and the entry is returned. `size: undefined` and a missing
  `size` are the same to the spec (`toEqual`); `null` is not `undefined`, so do not return `null`.
- The snake_case shape (`went_wrong`, `fix_rounds`) and the camelCase one read the same.
- `wentWrong: []` wins over a non-empty `went_wrong` (an array is an array); `wentWrong: "text"` falls
  through to `went_wrong`.
- Extra fields on the returned objects are fine; the spec reads only the six above.
- The default folder is read relative to the working directory (Playwright runs from the repo root),
  and C12.6 checks that `readSprintLog()` agrees with the spec's own reading of the real retros.

`C13.1` also expects `app/sprints/` to contain at least one `.ts`/`.tsx` file, and neither it nor
`lib/sprint-log.ts` to contain the text `content/` (comments are stripped; the import specifier
`@/content/profile` is the one allowed) or any use of `profile.<field>` other than `profile.name`.

## What the page must be (what the spec reads, so Forge need not guess)

- `main > header`'s first child is a `p` holding the only `a[href="/"]` of the header, with text
  `profile.name`; then the `h1` "Build log".
- One `main section` with `aria-labelledby="sprints"` and `h2#sprints`; inside it one `ol`; one
  `ol > li` per entry. Everything the spec reads from an entry: `h3`; the number is the h3's only
  direct-child `span` (its text is `Sprint ` in an `sr-only` span, then the digits); the goal is the
  rest of the h3's text; the meta line is the `p` that is the h3's next sibling (absent when it has
  no parts); the label is an `h4` "What went wrong" and the items are `ul > li` (both absent without
  items); the dot is the `::before` of each `ul > li`, positioned absolutely, with the `li` as its
  containing block (computed `left`/`top`/`margin-*` are read, so any way of writing `-left-3` and
  `top-[calc(0.5lh-1.5px)]` works).
- Between the number span and the goal there must be a real space in the h3's `textContent` (the
  spec compares it with `Sprint N <goal>` after collapsing runs of white space).
- A no-break space (U+00A0) before every `·` in the meta line.
- No `main` link other than the back link and the PR links.

## What the spec decides where the contract leaves a gap

- **The oracle** is `readOracle()` in the spec: the files' `sprint`, `goal`, `size`, `pr`, `outcome`,
  `wentWrong`/`went_wrong` read and judged with the spec's own few lines; it never imports the
  reader. A retro that is wrong is left out of the oracle (the real build fails on it, C12 shows the
  reader does). Sprints 1 to 11 are anchors: they must all be present, `Owner's call` must be on
  exactly 1, 2, 7, 9 and 10 among them, sprint 11 shows 2 items, 1 to 11 show 1 to 3, and sprints 1,
  8 and 11 have their goals word for word. Sprint 12 and later are read from the files.
- **Measuring "rule to h3 24 px"** is from the rule's bottom edge (the `li`'s top plus its 1 px
  border) to the h3's box; the tolerance is 1 px, so measuring from the rule's top (25) passes too.
  "Last line to the next rule 32" is from the bottom of the last box of the entry (the last item, or
  the meta line, or the h3) to the next `li`'s top. "Meta to label 16" and the item gaps are
  measured only where the neighbours exist.
- **Geometry (C6) and style (C7, C8) checks run with `reducedMotion: "reduce"`**, so the heading's
  rise (`main > section > h2`, a translate) cannot be caught mid-way; C9 (axe), C10 and C11 run with
  motion as a visitor has it.
- **"Two folders with the same `sprint`"** (C12.3) cannot be written without breaking the folder
  rule too (the folder is the number), so the fixture is folders `4` and `5`, both holding sprint 4:
  the reader must throw and name one of the two files. The repeat rule on its own is not isolated.
- **A link's 24 px** is `>= 23.95` to absorb layout rounding.
- **`Owner's call`** is the contract's text with a straight apostrophe.
- C2 does not check `og:title` or `twitter:title` (the contract lists the descriptions and URL only).
  A page that spreads the shared `openGraph` will have the home page's `og:title`; that is not a
  contract failure, only a thing to look at.

## How the checks were proved

A scratch reference build of the contract (a reader, `app/sprints/page.tsx` on Iris's markup with the
real space, the sitemap line) passes all 57 tests. Then 49 one-line mutants of it were each built and
run against the spec; every one that changes behaviour the contract fixes turned the check that owns
it red: sorting by folder name (C3, C4, C5, C10, C11, C12), no space after the number (C4.1), the
number not hung or 8 px off (C6.1), the dot 4 px off, off the line or square (C6.2), each spacing
value moved (C6.3), no rule (C6.3/C6.4), an item dropped or clamped (C5.1, C5.2), evidence leaked
(C5.1, C5.3), accent on a non-link, a background, a 700 weight, the xl step, a hex colour (C7, C9),
a link that is not inline-block (C4.3, C8.2, C9.4), a plain space before a dot (C4.2), a transition
on an entry (C11.2), the wrong h1, an svg, the wrong back-link text, an h5 label (C1, C9.3), a wider
or gappier main (C1.3, C8.1, C6.3), the home page's descriptions or twitter tag, a missing canonical
or sitemap line (C2), an extra tabindex or a link with no ring (C10), a "Merged" label (C4.2, C4.4),
a wrong "Owner's call" or label wording (C4.2, C5.1), a content/ path (C13.1), and nine reader
mutants (C12: skips instead of throwing, no folder rule, `pr: "36"` accepted, `went_wrong` first,
four items, backticks kept, no capital, ellipsis cut, the token rule loosened).

Two survivors, both by the contract's own design: the three-clause "Owner's call" rule of direction
§3.3 (`needs-owner` or starts with `not merged` or `open`) gives the same marks on sprints 1 to 12,
so only C12.4's fixtures tell it from the token rule (C12.4 turns red on it); and a rendered one-word
outcome such as `needs-owner` is not scanned (C5.3 scans strings of more than two words).

## Not covered by a test (and how it is shown instead)

- C13.2 and C13.3: the scope diff, `pnpm verify`, `pnpm test:e2e` and the route table with `/sprints`
  static are shown in the PR by Atlas and Forge.
- Hover colour of a link: C11.2 allows a colour transition only; the hover colour itself is not
  asserted (agent-browser's Chrome has no hover, and the home page's links are not tested for it
  either).
- Nothing can show that the page grows with a new retro without rebuilding; C12 and the oracle stand
  for it, as the contract says.
